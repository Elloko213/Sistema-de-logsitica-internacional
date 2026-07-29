// ============================================================================
// modules/operador.js — Panel del operador logístico
// Asignación de transportista + actualización de ubicación/estado (GPS)
// ============================================================================
import { supabase } from '../supabaseClient.js';
import { sesion } from '../auth.js';
import { notificar, ponerCargando, claseDeEstado, filaVacia } from '../ui.js';
import { cargarSelectorEnviosActivos } from './selectorEnvios.js';
import { asegurarEventoSeguimiento } from './seguimiento.js';

let filtroActual = 'pendientes';

export async function inicializarPanelOperador() {
  const tabs = document.querySelectorAll('#page-operador .pill-tab');
  tabs.forEach((tab, i) => {
    if (tab.dataset.bound) return;
    tab.dataset.bound = '1';
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      filtroActual = ['pendientes', 'asignados', 'todos'][i];
      cargarEnviosOperador();
    });
  });

  const formUbicacion = document.getElementById('form-actualizar-ubicacion');
  if (formUbicacion && !formUbicacion.dataset.bound) {
    formUbicacion.dataset.bound = '1';
    formUbicacion.addEventListener('submit', guardarActualizacionUbicacion);
  }

  const botonGps = document.getElementById('btn-usar-gps');
  if (botonGps && !botonGps.dataset.bound) {
    botonGps.dataset.bound = '1';
    botonGps.addEventListener('click', usarUbicacionActual);
  }

  await cargarTransportistas();
  await cargarEnviosOperador();
  cargarSelectorEnviosActivos('op-codigo');
}

function usarUbicacionActual() {
  if (!navigator.geolocation) {
    notificar('Este navegador no permite obtener la ubicación GPS.', 'error');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      document.getElementById('op-lat').value = coords.latitude.toFixed(6);
      document.getElementById('op-lng').value = coords.longitude.toFixed(6);
      notificar('Coordenadas GPS obtenidas.', 'exito');
    },
    () => notificar('No se pudo obtener el GPS. Revisa el permiso de ubicación.', 'error'),
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

async function cargarTransportistas() {
  const { data, error } = await supabase.from('transportistas').select('*').eq('activo', true);
  if (error) {
    console.error(error);
    window.SGLI._transportistas = [];
    notificar('No se pudieron cargar los transportistas. Revisa los permisos de Supabase.', 'error');
    return;
  }
  window.SGLI._transportistas = data || [];
  if (!data?.length) {
    notificar('No hay transportistas activos. Carga el catálogo inicial en Supabase.', 'error');
  }
}

export async function cargarEnviosOperador() {
  const tbody = document.getElementById('tabla-body-operador');
  if (!tbody) return;

  let query = supabase.from('envios').select('*').order('created_at', { ascending: false });
  if (filtroActual === 'pendientes') query = query.is('transportista', null);
  if (filtroActual === 'asignados') query = query.not('transportista', 'is', null);

  const { data, error } = await query;
  if (error) { console.error(error); notificar('Error al cargar envíos.', 'error'); return; }

  tbody.innerHTML = '';
  if (!data.length) {
    filaVacia(tbody, 6, 'No hay envíos en esta categoría.');
    return;
  }

  const transportistas = window.SGLI._transportistas || [];
  data.forEach(envio => {
    const tr = document.createElement('tr');
    const opciones = transportistas.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
    const hayTransportistas = transportistas.length > 0;
    tr.innerHTML = `
      <td><strong>${envio.codigo}</strong></td>
      <td>${envio.ciudad_origen || '—'} → ${envio.ciudad_destino || '—'}</td>
      <td>${envio.mercancia || '—'}</td>
      <td>${new Date(envio.created_at).toLocaleDateString('es-BO')}</td>
      <td>
        ${envio.transportista
          ? `<span class="status entregado">${envio.transportista}</span>`
          : `<select data-envio="${envio.id}" style="margin:0; padding:6px 8px; font-size:12.5px;" ${hayTransportistas ? '' : 'disabled'}>
              <option value="">${hayTransportistas ? 'Seleccionar transportista...' : 'No hay transportistas activos'}</option>${opciones}
            </select>`}
      </td>
      <td>${envio.transportista ? '' : `<button class="btn small" data-envio="${envio.id}" data-codigo="${envio.codigo}" ${hayTransportistas ? '' : 'disabled'}>Asignar</button>`}</td>
    `;
    const btn = tr.querySelector('button');
    if (btn) btn.addEventListener('click', () => asignarTransportista(tr, envio));
    tbody.appendChild(tr);
  });
}

async function asignarTransportista(fila, envio) {
  const select = fila.querySelector('select');
  const transportistaId = select?.value;
  if (!transportistaId) {
    notificar('Selecciona un transportista antes de asignar.', 'error');
    return;
  }
  const nombreTransportista = select.options[select.selectedIndex].textContent;
  const boton = fila.querySelector('button');
  const restaurar = ponerCargando(boton, 'Asignando...');

  const { error: e1 } = await supabase.from('envios')
    .update({ transportista: nombreTransportista, estado: 'En tránsito', clase: 'transito' })
    .eq('id', envio.id);

  const errorHistorial = e1 ? null : await asegurarEventoSeguimiento({
    envioId: envio.id,
    estado: 'En tránsito',
    clase: 'transito',
    ubicacion: envio.ubi_texto || 'Transportista asignado',
    lat: envio.lat,
    lng: envio.lng,
  });

  const { error: e2 } = await supabase.from('asignaciones_transporte').insert([{
    envio_id: envio.id,
    transportista_id: transportistaId,
    operador_id: sesion.usuario.id,
  }]);

  restaurar();

  if (e1 || e2 || errorHistorial) {
    console.error(e1 || e2 || errorHistorial);
    notificar('No se pudo completar la asignación.', 'error');
    return;
  }
  notificar(`Transportista asignado a ${envio.codigo}.`, 'exito');
  cargarEnviosOperador();
}

async function guardarActualizacionUbicacion(ev) {
  ev.preventDefault();
  const boton = document.getElementById('btn-guardar-ubicacion');
  const restaurar = ponerCargando(boton, 'Guardando...');

  const codigo = document.getElementById('op-codigo').value.trim();
  const ubicacion = document.getElementById('op-ubicacion').value.trim();
  const estado = document.getElementById('op-estado').value;
  const clase = claseDeEstado(estado);
  const lat = Number(document.getElementById('op-lat').value);
  const lng = Number(document.getElementById('op-lng').value);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lng) || lng < -180 || lng > 180) {
    restaurar();
    notificar('Ingresa coordenadas GPS válidas.', 'error');
    return;
  }

  const { data: envio, error: e1 } = await supabase
    .from('envios').select('id').eq('codigo', codigo).maybeSingle();

  if (e1 || !envio) {
    restaurar();
    notificar('No se encontró un envío con ese código.', 'error');
    return;
  }

  const { error: e2 } = await supabase.from('envios')
    .update({ estado, clase, ubi_texto: ubicacion, lat, lng })
    .eq('id', envio.id);

  const errorHistorial = e2 ? null : await asegurarEventoSeguimiento({
    envioId: envio.id, estado, clase, ubicacion, lat, lng,
  });

  restaurar();

  if (e2 || errorHistorial) {
    console.error(e2 || errorHistorial);
    notificar('No se pudo guardar la actualización.', 'error');
    return;
  }
  notificar(`Ubicación de ${codigo} actualizada.`, 'exito');
  document.getElementById('form-actualizar-ubicacion').reset();
  cargarEnviosOperador();
  cargarSelectorEnviosActivos('op-codigo');
}
