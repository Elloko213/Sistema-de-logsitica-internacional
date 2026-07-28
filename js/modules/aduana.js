// ============================================================================
// modules/aduana.js — Panel del agente de aduanas
// ============================================================================
import { supabase } from '../supabaseClient.js';
import { sesion } from '../auth.js';
import { notificar, ponerCargando, filaVacia, formatoFecha } from '../ui.js';

export function inicializarPanelAduana() {
  const form = document.getElementById('form-tramite-aduana');
  if (form && !form.dataset.bound) {
    form.dataset.bound = '1';
    form.addEventListener('submit', guardarTramite);
  }
  cargarTramitesRecientes();
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

  // Si el trámite se libera, el envío avanza de estado automáticamente
  let e3 = null;
  if (estadoTramite === 'Liberado') {
    const r = await supabase.from('envios')
      .update({ estado: 'En almacén', clase: 'almacen', ubi_texto: 'Liberado de aduana' })
      .eq('id', envio.id);
    e3 = r.error;
  } else if (estadoTramite === 'Observado') {
    const r = await supabase.from('envios')
      .update({ estado: 'Observado', clase: 'transito' })
      .eq('id', envio.id);
    e3 = r.error;
  } else {
    const r = await supabase.from('envios')
      .update({ estado: 'En aduana', clase: 'aduana' })
      .eq('id', envio.id);
    e3 = r.error;
  }

  restaurar();

  if (e2 || e3) {
    console.error(e2 || e3);
    notificar('No se pudo guardar el trámite.', 'error');
    return;
  }
  notificar(`Trámite de ${codigo} registrado.`, 'exito');
  document.getElementById('form-tramite-aduana').reset();
  cargarTramitesRecientes();
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
