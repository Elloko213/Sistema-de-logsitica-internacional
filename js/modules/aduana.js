// ============================================================================
// modules/aduana.js — Panel del agente de aduanas
// ============================================================================
import { supabase } from '../supabaseClient.js';
import { sesion } from '../auth.js';
import { notificar, ponerCargando, filaVacia, formatoFecha } from '../ui.js';
import { cargarSelectorEnviosActivos } from './selectorEnvios.js';
import { asegurarEventoSeguimiento } from './seguimiento.js';

export function inicializarPanelAduana() {
  const form = document.getElementById('form-tramite-aduana');
  if (form && !form.dataset.bound) {
    form.dataset.bound = '1';
    form.addEventListener('submit', guardarTramite);
  }
  cargarTramitesRecientes();
  cargarSelectorEnviosActivos('ad-codigo');
}

async function guardarTramite(ev) {
  ev.preventDefault();
  const boton = document.getElementById('btn-guardar-tramite');
  const restaurar = ponerCargando(boton, 'Guardando...');

  const codigo = document.getElementById('ad-codigo').value.trim();
  const documentacion = document.getElementById('ad-documentacion').value;
  const estadoTramite = document.getElementById('ad-estado').value;
  const observaciones = document.getElementById('ad-observaciones').value.trim();

  const { data: envio, error: e1 } = await supabase
    .from('envios').select('id').eq('codigo', codigo).maybeSingle();

  if (e1 || !envio) {
    restaurar();
    notificar('No se encontró un envío con ese código.', 'error');
    return;
  }

  const { error: e2 } = await supabase.from('tramites_aduana').insert([{
    envio_id: envio.id,
    documentacion,
    estado_tramite: estadoTramite,
    observaciones,
    agente_id: sesion.usuario.id,
  }]);

  const actualizacion = estadoTramite === 'Liberado'
    ? { estado: 'En almacén', clase: 'almacen', ubi_texto: 'Liberado de aduana' }
    : estadoTramite === 'Observado'
      ? { estado: 'Observado', clase: 'transito', ubi_texto: 'Control aduanero — Observado' }
      : { estado: 'En aduana', clase: 'aduana', ubi_texto: 'Control aduanero — En revisión' };
  const { error: e3 } = await supabase.from('envios')
    .update(actualizacion)
    .eq('id', envio.id);
  const errorHistorial = e3 ? null : await asegurarEventoSeguimiento({
    envioId: envio.id,
    estado: actualizacion.estado,
    clase: actualizacion.clase,
    ubicacion: actualizacion.ubi_texto,
  });

  restaurar();

  if (e2 || e3 || errorHistorial) {
    console.error(e2 || e3 || errorHistorial);
    notificar('No se pudo guardar el trámite.', 'error');
    return;
  }
  notificar(`Trámite de ${codigo} registrado.`, 'exito');
  document.getElementById('form-tramite-aduana').reset();
  cargarTramitesRecientes();
  cargarSelectorEnviosActivos('ad-codigo');
}

async function cargarTramitesRecientes() {
  const tbody = document.getElementById('tabla-body-aduana');
  if (!tbody) return;

  const { data, error } = await supabase
    .from('tramites_aduana')
    .select('*, envios(codigo)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) { console.error(error); notificar('Error al cargar trámites.', 'error'); return; }

  tbody.innerHTML = '';
  if (!data.length) {
    filaVacia(tbody, 4, 'Todavía no registraste ningún trámite aduanero.');
    return;
  }

  const claseMap = { 'En revisión': 'aduana', 'Observado': 'transito', 'Liberado': 'entregado' };
  data.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.envios?.codigo || '—'}</td>
      <td>${t.documentacion}</td>
      <td><span class="status ${claseMap[t.estado_tramite] || 'aduana'}">${t.estado_tramite}</span></td>
      <td>${formatoFecha(t.created_at)}</td>
    `;
    tbody.appendChild(tr);
  });
}
