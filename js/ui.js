// ============================================================================
// ui.js — Utilidades de interfaz compartidas por todos los módulos
// ============================================================================

/** Muestra una notificación flotante (toast) */
export function notificar(mensaje, tipo = 'info', titulo = '') {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = `toast ${tipo}`;
  t.innerHTML = `${titulo ? `<div class="titulo">${titulo}</div>` : ''}<div>${mensaje}</div>`;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

/** Pone un botón en estado "cargando" y devuelve una función para restaurarlo */
export function ponerCargando(boton, textoCargando = 'Procesando...') {
  const original = boton.innerHTML;
  boton.disabled = true;
  boton.innerHTML = `<span class="spinner"></span> ${textoCargando}`;
  return () => {
    boton.disabled = false;
    boton.innerHTML = original;
  };
}

/** Formatea una fecha ISO a algo legible en español */
export function formatoFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Mapea un estado textual a la clase CSS de color usada en .status */
export function claseDeEstado(estado) {
  const mapa = {
    'Registrado': 'registrado',
    'En tránsito': 'transito',
    'En aduana': 'aduana',
    'En almacén': 'almacen',
    'Entregado': 'entregado',
    'Liberado': 'entregado',
    'Observado': 'transito',
    'En revisión': 'aduana',
    'Despachado': 'entregado',
  };
  return mapa[estado] || 'registrado';
}

/** Genera un código de seguimiento único con prefijo SGLI */
export function generarCodigo() {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `SGLI-${n}`;
}

/** Renderiza una fila de "sin resultados" dentro de un <tbody> */
export function filaVacia(tbody, colspan, texto = 'No hay registros todavía.') {
  tbody.innerHTML = `<tr><td colspan="${colspan}"><div class="empty-state">${texto}</div></td></tr>`;
}
