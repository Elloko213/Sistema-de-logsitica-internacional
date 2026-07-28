// ============================================================================
// modules/cliente.js — Mis envíos / Registrar envío / Consultar estado
// ============================================================================
import { supabase } from '../supabaseClient.js';
import { sesion } from '../auth.js';
import { notificar, ponerCargando, formatoFecha, generarCodigo, filaVacia } from '../ui.js';

let mapa, marcador;

// ---------------------------------------------------------------- Mis envíos
export async function cargarMisEnvios() {
  const tbody = document.getElementById('tabla-body-envios');
  if (!tbody) return;

  const { data, error } = await supabase
    .from('envios')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error cargando envíos:', error);
    notificar('No se pudieron cargar tus envíos.', 'error');
    return;
  }

  document.getElementById('contador-activos').textContent = data.filter(e => e.clase !== 'entregado').length;
  document.getElementById('kpi-transito').textContent = data.filter(e => e.clase === 'transito').length;
  document.getElementById('kpi-aduana').textContent = data.filter(e => e.clase === 'aduana').length;
  document.getElementById('kpi-entregados').textContent = data.filter(e => e.clase === 'entregado').length;

  tbody.innerHTML = '';
  if (!data.length) {
    filaVacia(tbody, 6, 'Todavía no registraste ningún envío. Usa el botón "Registrar nuevo envío".');
    return;
  }

  data.forEach(envio => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${envio.codigo}</strong></td>
      <td>${envio.ciudad_origen || '—'} → ${envio.ciudad_destino || '—'}</td>
      <td>${envio.mercancia || '—'}</td>
      <td><span class="status ${envio.clase}">${envio.estado}</span></td>
      <td>${formatoFecha(envio.updated_at)}</td>
      <td><button class="btn small secondary" data-codigo="${envio.codigo}">Ver GPS</button></td>
    `;
    tr.querySelector('button').addEventListener('click', () => window.SGLI.irASeguimiento(envio.codigo));
    tbody.appendChild(tr);
  });
}

// ---------------------------------------------------------------- Nuevo envío
export function inicializarFormularioEnvio() {
  const form = document.getElementById('form-nuevo-envio');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';
  form.addEventListener('submit', crearNuevoEnvio);
}

async function crearNuevoEnvio(ev) {
  ev.preventDefault();
  const boton = document.getElementById('btn-crear-envio');
  const restaurar = ponerCargando(boton, 'Guardando...');

  const val = id => document.getElementById(id)?.value?.trim();

  const payload = {
    codigo: generarCodigo(),
    cliente_id: sesion.usuario.id,
    pais_origen: val('reg-pais-origen') || 'Bolivia',
    pais_destino: val('reg-pais-destino'),
    ciudad_origen: val('reg-ciudad-origen') || 'La Paz',
    ciudad_destino: val('reg-ciudad-destino'),
    mercancia: val('reg-mercancia'),
    transporte: val('reg-transporte'),
    peso_kg: val('reg-peso') ? Number(val('reg-peso')) : null,
    dimensiones: val('reg-dimensiones'),
    fecha_programada: val('reg-fecha') || null,
    observaciones: val('reg-observaciones'),
    estado: 'Registrado',
    clase: 'registrado',
    lat: -16.4897,
    lng: -68.1193,
    ubi_texto: `Almacén de origen (${val('reg-ciudad-origen') || 'La Paz'})`,
  };

  const { data, error } = await supabase.from('envios').insert([payload]).select().single();
  restaurar();

  if (error) {
    console.error(error);
    notificar('Ocurrió un error al registrar el envío. Verifica los datos.', 'error');
    return;
  }

  document.getElementById('preview-codigo').textContent = data.codigo;
  notificar(`Envío ${data.codigo} guardado correctamente.`, 'exito', '¡Listo!');
  document.getElementById('form-nuevo-envio').reset();
  window.SGLI.irASeguimiento(data.codigo);
}

// ---------------------------------------------------------------- Seguimiento GPS
export function inicializarMapa() {
  if (mapa) return;
  mapa = L.map('map').setView([-16.4897, -68.1193], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
  }).addTo(mapa);
  marcador = L.marker([-16.4897, -68.1193]).addTo(mapa);
}

export function refrescarMapa() {
  if (mapa) setTimeout(() => mapa.invalidateSize(), 200);
}

export async function buscarEnvio() {
  const codigo = document.getElementById('input-track').value.trim();
  if (!codigo) return;

  const { data, error } = await supabase
    .from('envios')
    .select('*')
    .eq('codigo', codigo)
    .maybeSingle();

  if (error || !data) {
    notificar('Código no encontrado. Verifica e intenta de nuevo.', 'error');
    return;
  }

  inicializarMapa();
  const latlng = [data.lat, data.lng];
  mapa.setView(latlng, 8);
  marcador.setLatLng(latlng).bindPopup(`<b>${data.codigo}</b><br>${data.estado}`).openPopup();

  document.getElementById('historial-ubicacion').textContent = data.ubi_texto || '—';
  const estadoEl = document.getElementById('historial-estado');
  estadoEl.textContent = data.estado;
  estadoEl.className = `status ${data.clase}`;

  await cargarHistorialSeguimiento(data.id);
}

async function cargarHistorialSeguimiento(envioId) {
  const cuerpo = document.getElementById('tabla-body-historial');
  if (!cuerpo) return;

  const { data, error } = await supabase
    .from('seguimiento_historial')
    .select('*')
    .eq('envio_id', envioId)
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return; }

  cuerpo.innerHTML = '';
  if (!data.length) {
    filaVacia(cuerpo, 3, 'Aún no hay eventos de seguimiento registrados por operación.');
    return;
  }
  data.forEach(ev => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatoFecha(ev.created_at)}</td>
      <td>${ev.ubicacion || '—'}</td>
      <td><span class="status ${ev.clase}">${ev.estado}</span></td>
    `;
    cuerpo.appendChild(tr);
  });
}
