// ============================================================================
// modules/almacen.js — Panel del encargado de almacén
// ============================================================================
import { supabase } from '../supabaseClient.js';
import { sesion } from '../auth.js';
import { notificar, ponerCargando, filaVacia, formatoFecha } from '../ui.js';

let tipoMovimientoActual = 'Ingreso';

export function inicializarPanelAlmacen() {
  const tabs = document.querySelectorAll('#page-almacen .pill-tab');
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      tipoMovimientoActual = i === 0 ? 'Ingreso' : 'Salida';
      document.getElementById('btn-registrar-movimiento').textContent =
        tipoMovimientoActual === 'Ingreso' ? 'Registrar ingreso' : 'Registrar salida';
    });
  });

  const form = document.getElementById('form-movimiento-almacen');
  if (form && !form.dataset.bound) {
    form.dataset.bound = '1';
    form.addEventListener('submit', registrarMovimiento);
  }

  cargarInventario();
}

async function registrarMovimiento(ev) {
  ev.preventDefault();
  const boton = document.getElementById('btn-registrar-movimiento');
  const restaurar = ponerCargando(boton, 'Guardando...');

  const codigo = document.getElementById('al-codigo').value.trim();
  const cantidad = document.getElementById('al-cantidad').value.trim();
  const ubicacion = document.getElementById('al-ubicacion').value.trim();
  const responsable = document.getElementById('al-responsable').value.trim();

  const { data: envio } = await supabase
    .from('envios').select('id').eq('codigo', codigo).maybeSingle();

  const { error: e1 } = await supabase.from('movimientos_almacen').insert([{
    envio_id: envio?.id || null,
    codigo_envio: codigo,
    tipo_movimiento: tipoMovimientoActual,
    cantidad,
    ubicacion_bodega: ubicacion,
    responsable,
    encargado_id: sesion.usuario.id,
  }]);

  let e2 = null;
  if (envio) {
    const nuevoEstado = tipoMovimientoActual === 'Ingreso'
      ? { estado: 'En almacén', clase: 'almacen', ubi_texto: `Bodega — ${ubicacion || 'sin ubicación'}` }
      : { estado: 'Despachado', clase: 'entregado', ubi_texto: 'Despachado desde almacén' };
    const r = await supabase.from('envios').update(nuevoEstado).eq('id', envio.id);
    e2 = r.error;
  }

  restaurar();

  if (e1 || e2) {
    console.error(e1 || e2);
    notificar('No se pudo registrar el movimiento.', 'error');
    return;
  }
  notificar(`Movimiento de ${codigo} (${tipoMovimientoActual}) guardado.`, 'exito');
  document.getElementById('form-movimiento-almacen').reset();
  cargarInventario();
}

async function cargarInventario() {
  const tbody = document.getElementById('tabla-body-almacen');
  if (!tbody) return;

  const { data, error } = await supabase
    .from('movimientos_almacen')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) { console.error(error); notificar('Error al cargar el inventario.', 'error'); return; }

  tbody.innerHTML = '';
  if (!data.length) {
    filaVacia(tbody, 4, 'Todavía no hay movimientos de mercancía registrados.');
    return;
  }

  data.forEach(m => {
    const tr = document.createElement('tr');
    const estado = m.tipo_movimiento === 'Ingreso'
      ? '<span class="status almacen">En almacén</span>'
      : '<span class="status entregado">Despachado</span>';
    tr.innerHTML = `
      <td>${m.codigo_envio}</td>
      <td>${m.cantidad || '—'}</td>
      <td>${m.ubicacion_bodega || '—'}</td>
      <td>${estado}</td>
    `;
    tbody.appendChild(tr);
  });
}
