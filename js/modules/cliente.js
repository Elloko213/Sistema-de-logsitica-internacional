// ============================================================================
// modules/cliente.js — Mis envíos / Registrar envío / Consultar estado
// ============================================================================
import { supabase } from '../supabaseClient.js';
import { sesion } from '../auth.js';
import {
  notificar, ponerCargando, formatoFecha, generarCodigo, filaVacia,
  mensajeErrorSupabase, filtrarEnvios,
} from '../ui.js';
import { asegurarEventoSeguimiento } from './seguimiento.js';

let mapa, marcador;
let enviosCliente = [];
let codigoBorrador;

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

  enviosCliente = data || [];
  document.getElementById('contador-activos').textContent = data.filter(e => e.clase !== 'entregado').length;
  document.getElementById('kpi-transito').textContent = data.filter(e => e.clase === 'transito').length;
  document.getElementById('kpi-aduana').textContent = data.filter(e => e.clase === 'aduana').length;
  document.getElementById('kpi-entregados').textContent = data.filter(e => e.clase === 'entregado').length;

  enlazarFiltrosEnvios();
  renderizarEnvios();
}

function enlazarFiltrosEnvios() {
  const buscar = document.getElementById('filtro-envios');
  const estado = document.getElementById('filtro-estado');
  if (!buscar?.dataset.bound) {
    buscar.dataset.bound = '1';
    buscar.addEventListener('input', renderizarEnvios);
  }
  if (!estado?.dataset.bound) {
    estado.dataset.bound = '1';
    estado.addEventListener('change', renderizarEnvios);
  }
}

function renderizarEnvios() {
  const tbody = document.getElementById('tabla-body-envios');
  if (!tbody) return;

  const termino = document.getElementById('filtro-envios')?.value.trim().toLowerCase() || '';
  const estado = document.getElementById('filtro-estado')?.value || '';
  const visibles = filtrarEnvios(enviosCliente, termino, estado);

  const total = document.getElementById('total-envios');
  if (total) total.textContent = termino || estado
    ? `${visibles.length} de ${enviosCliente.length}`
    : `${enviosCliente.length} ${enviosCliente.length === 1 ? 'registro' : 'registros'}`;

  tbody.innerHTML = '';
  if (!visibles.length) {
    filaVacia(
      tbody,
      6,
      enviosCliente.length
        ? 'No hay envíos que coincidan con los filtros.'
        : 'Todavía no registraste envíos. Usa “Registrar nuevo envío” para comenzar.',
    );
    return;
  }

  visibles.forEach(envio => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong class="tracking-code">${envio.codigo}</strong></td>
      <td class="route-cell">
        <strong>${envio.ciudad_origen || 'Sin origen'} → ${envio.ciudad_destino || 'Sin destino'}</strong>
        <span>${envio.pais_origen || '—'} · ${envio.pais_destino || '—'}</span>
      </td>
      <td>${envio.mercancia || '—'}</td>
      <td><span class="status ${envio.clase}">${envio.estado}</span></td>
      <td>${formatoFecha(envio.updated_at)}</td>
      <td><button class="btn small secondary" data-codigo="${envio.codigo}">Seguir</button></td>
    `;
    tr.querySelector('button').addEventListener('click', () => window.SGLI.irASeguimiento(envio.codigo));
    tbody.appendChild(tr);
  });
}

// ---------------------------------------------------------------- Nuevo envío
export function inicializarFormularioEnvio() {
  const form = document.getElementById('form-nuevo-envio');
  if (!form) return;
  codigoBorrador ||= generarCodigo();
  actualizarResumenEnvio();
  if (form.dataset.bound) return;
  form.dataset.bound = '1';
  form.addEventListener('submit', crearNuevoEnvio);
  form.addEventListener('input', actualizarResumenEnvio);
  form.addEventListener('change', actualizarResumenEnvio);
}

function actualizarResumenEnvio() {
  const valor = id => document.getElementById(id)?.value.trim() || '';
  const poner = (id, texto) => {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
  };
  const origen = [valor('reg-ciudad-origen'), valor('reg-pais-origen')].filter(Boolean).join(', ');
  const destino = [valor('reg-ciudad-destino'), valor('reg-pais-destino')].filter(Boolean).join(', ');
  const fecha = valor('reg-fecha');
  const requeridos = [
    valor('reg-pais-origen'),
    valor('reg-pais-destino'),
    valor('reg-ciudad-origen'),
    valor('reg-ciudad-destino'),
    valor('reg-peso'),
  ];
  const porcentaje = Math.round((requeridos.filter(Boolean).length / requeridos.length) * 100);
  const listo = porcentaje === 100;

  poner('preview-codigo', codigoBorrador);
  poner('preview-origen', origen || 'Por completar');
  poner('preview-destino', destino || 'Por completar');
  poner('preview-carga', valor('reg-mercancia') || 'Por completar');
  poner('preview-transporte', valor('reg-transporte') || 'Por completar');
  poner('preview-peso', valor('reg-peso') ? `${valor('reg-peso')} kg` : 'Por completar');
  poner('preview-dimensiones', valor('reg-dimensiones') || 'Sin definir');
  poner('preview-observaciones', valor('reg-observaciones') || 'Sin observaciones');
  poner('preview-fecha', fecha
    ? new Date(`${fecha}T00:00:00`).toLocaleDateString(
      'es-BO',
      { day: '2-digit', month: 'short', year: 'numeric' },
    )
    : 'Sin definir');

  const progreso = document.getElementById('preview-progress');
  if (progreso) progreso.style.width = `${porcentaje}%`;
  poner('preview-progress-label', listo
    ? 'Resumen listo para registrar'
    : `${porcentaje}% de los datos requeridos`);
  const estado = document.getElementById('preview-estado');
  if (estado) {
    estado.textContent = listo ? 'Listo' : 'Borrador';
    estado.className = `status ${listo ? 'entregado' : 'registrado'}`;
  }
}

async function crearNuevoEnvio(ev) {
  ev.preventDefault();
  if (!sesion.usuario?.id) {
    notificar('Tu sesión expiró. Inicia sesión nuevamente.', 'error');
    return;
  }
  const boton = document.getElementById('btn-crear-envio');
  const restaurar = ponerCargando(boton, 'Guardando...');

  const val = id => document.getElementById(id)?.value?.trim();

  const payload = {
    codigo: codigoBorrador || generarCodigo(),
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
    notificar(mensajeErrorSupabase(error, 'registrar el envío'), 'error');
    return;
  }

  const errorHistorial = await asegurarEventoSeguimiento({
    envioId: data.id,
    estado: data.estado,
    clase: data.clase,
    ubicacion: data.ubi_texto,
    lat: data.lat,
    lng: data.lng,
  });
  if (errorHistorial) console.error('No se pudo iniciar el historial:', errorHistorial);

  document.getElementById('preview-codigo').textContent = data.codigo;
  notificar(`Envío ${data.codigo} guardado correctamente.`, 'exito', '¡Listo!');
  codigoBorrador = generarCodigo();
  document.getElementById('form-nuevo-envio').reset();
  actualizarResumenEnvio();
  window.SGLI.irASeguimiento(data.codigo);
}

// ---------------------------------------------------------------- Seguimiento GPS
export function inicializarSeguimiento() {
  inicializarMapa();
  refrescarMapa();
  const form = document.getElementById('form-buscar-envio');
  if (!form?.dataset.bound) {
    form.dataset.bound = '1';
    form.addEventListener('submit', buscarEnvio);
  }
}

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

export async function buscarEnvio(ev) {
  ev?.preventDefault();
  const input = document.getElementById('input-track');
  const codigo = input.value.trim().toUpperCase();
  if (!codigo) return;
  input.value = codigo;

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
  document.getElementById('track-code-display').textContent = data.codigo;
  document.getElementById('track-coordinates').textContent =
    `${Number(data.lat).toFixed(5)}, ${Number(data.lng).toFixed(5)}`;
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
