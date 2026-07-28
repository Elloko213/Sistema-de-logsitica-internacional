// ============================================================================
// modules/operador.js — Panel del operador logístico
// Asignación de transportista + actualización de ubicación/estado (GPS)
// ============================================================================
import { supabase } from '../supabaseClient.js';
import { sesion } from '../auth.js';
import { notificar, ponerCargando, claseDeEstado, filaVacia } from '../ui.js';

let filtroActual = 'pendientes';

export function inicializarPanelOperador() {
  const tabs = document.querySelectorAll('#page-operador .pill-tab');
  tabs.forEach((tab, i) => {
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

  cargarTransportistas();
  cargarEnviosOperador();
}

async function cargarTransportistas() {
  const { data, error } = await supabase.from('transportistas').select('*').eq('activo', true);
  if (error) { console.error(error); return; }
  window.SGLI._transportistas = data || [];
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
    tr.innerHTML = `
      <td><strong>${envio.codigo}</strong></td>
      <td>${envio.ciudad_origen || '—'} → ${envio.ciudad_destino || '—'}</td>
      <td>${envio.mercancia || '—'}</td>
      <td>${new Date(envio.created_at).toLocaleDateString('es-BO')}</td>
      <td>
        ${envio.transportista
          ? `<span class="status entregado">${envio.transportista}</span>`
          : `<select data-envio="${envio.id}" style="margin:0; padding:6px 8px; font-size:12.5px;">
              <option value="">Seleccionar transportista...</option>${opciones}
            </select>`}
      </td>
      <td>${envio.transportista ? '' : `<button class="btn small" data-envio="${envio.id}" data-codigo="${envio.codigo}">Asignar</button>`}</td>
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

  const { error: e2 } = await supabase.from('asignaciones_transporte').insert([{
    envio_id: envio.id,
    transportista_id: transportistaId,
    operador_id: sesion.usuario.id,
  }]);

  restaurar();

  if (e1 || e2) {
    console.error(e1 || e2);
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

  const { data: envio, error: e1 } = await supabase
    .from('envios').select('id').eq('codigo', codigo).maybeSingle();

  if (e1 || !envio) {
    restaurar();
    notificar('No se encontró un envío con ese código.', 'error');
    return;
  }

  const { error: e2 } = await supabase.from('envios')
    .update({ estado, clase, ubi_texto: ubicacion })
    .eq('id', envio.id);

  const { error: e3 } = await supabase.from('seguimiento_historial').insert([{
    envio_id: envio.id,
    estado, clase, ubicacion,
    registrado_por: sesion.usuario.id,
  }]);

  restaurar();

  if (e2 || e3) {
    console.error(e2 || e3);
    notificar('No se pudo guardar la actualización.', 'error');
    return;
  }
  notificar(`Ubicación de ${codigo} actualizada.`, 'exito');
  document.getElementById('form-actualizar-ubicacion').reset();
  cargarEnviosOperador();
}
