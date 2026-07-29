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
  return `SGLI-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

/** Convierte errores técnicos de Supabase en mensajes útiles para el usuario. */
export function mensajeErrorSupabase(error, accion = 'completar la operación') {
  const detalle = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  if (detalle.includes('42501') || detalle.includes('permission denied') || detalle.includes('row-level security')) {
    return `No tienes permisos para ${accion}. Ejecuta la corrección SQL de permisos o revisa tu rol.`;
  }
  if (detalle.includes('23505') || detalle.includes('duplicate')) {
    return 'El registro ya existe. Vuelve a intentarlo.';
  }
  if (detalle.includes('23503') || detalle.includes('foreign key')) {
    return 'Tu usuario no tiene un perfil válido asociado.';
  }
  return `No se pudo ${accion}. ${error?.message || 'Verifica la conexión e intenta nuevamente.'}`;
}

/** Filtra el listado del cliente por texto libre y estado logístico. */
export function filtrarEnvios(envios, termino = '', estado = '') {
  const busqueda = termino.trim().toLowerCase();
  return envios.filter(envio => {
    const texto = [
      envio.codigo, envio.ciudad_origen, envio.ciudad_destino, envio.mercancia,
    ].join(' ').toLowerCase();
    return (!busqueda || texto.includes(busqueda)) && (!estado || envio.clase === estado);
  });
}

/** Renderiza una fila de "sin resultados" dentro de un <tbody> */
export function filaVacia(tbody, colspan, texto = 'No hay registros todavía.') {
  tbody.innerHTML = `<tr><td colspan="${colspan}"><div class="empty-state">${texto}</div></td></tr>`;
}
