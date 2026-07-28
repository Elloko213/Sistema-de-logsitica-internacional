// ============================================================================
// auth.js — Autenticación real con Supabase Auth + tabla de perfiles/roles
// ============================================================================
import { supabase } from './supabaseClient.js';
import { notificar, ponerCargando } from './ui.js';

// Estado de sesión en memoria (se llena al iniciar y tras login)
export const sesion = {
  usuario: null,   // objeto de auth.users
  perfil: null,    // fila de public.perfiles (incluye .rol)
};

/** Recupera la sesión activa (si el usuario ya había iniciado sesión antes) y su perfil */
export async function restaurarSesion() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  sesion.usuario = session.user;
  sesion.perfil = await cargarPerfil(session.user.id);
  return sesion.perfil;
}

async function cargarPerfil(userId) {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('Error cargando perfil:', error);
    return null;
  }
  return data;
}

/** Inicia sesión con correo y contraseña */
export async function iniciarSesion(correo, contrasena, boton) {
  const restaurar = boton ? ponerCargando(boton, 'Ingresando...') : null;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });
    if (error) {
      notificar(traducirError(error.message), 'error', 'No se pudo iniciar sesión');
      return null;
    }
    sesion.usuario = data.user;
    sesion.perfil = await cargarPerfil(data.user.id);
    if (!sesion.perfil) {
      notificar('Tu cuenta no tiene un perfil asociado. Contacta al administrador.', 'error');
      return null;
    }
    return sesion.perfil;
  } finally {
    if (restaurar) restaurar();
  }
}

/** Registra un nuevo cliente (rol fijo: cliente) */
export async function registrarCliente({ nombres, apellidos, empresa, correo, contrasena }, boton) {
  const restaurar = boton ? ponerCargando(boton, 'Creando cuenta...') : null;
  try {
    const { data, error } = await supabase.auth.signUp({
      email: correo,
      password: contrasena,
      options: {
        data: { nombres, apellidos, empresa, rol: 'cliente' },
      },
    });
    if (error) {
      notificar(traducirError(error.message), 'error', 'No se pudo crear la cuenta');
      return null;
    }
    // Si la confirmación de correo está desactivada en el proyecto, ya llega sesión activa.
    if (data.session) {
      sesion.usuario = data.user;
      sesion.perfil = await cargarPerfil(data.user.id);
    }
    return data;
  } finally {
    if (restaurar) restaurar();
  }
}

/** Cierra sesión */
export async function cerrarSesion() {
  await supabase.auth.signOut();
  sesion.usuario = null;
  sesion.perfil = null;
}

/** Traduce mensajes comunes de error de Supabase Auth al español */
function traducirError(msg) {
  const mapa = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'User already registered': 'Ya existe una cuenta con este correo.',
    'Email not confirmed': 'Debes confirmar tu correo antes de iniciar sesión.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
  };
  return mapa[msg] || msg;
}

/** Config de navegación / páginas permitidas por rol */
export const PAGINAS_POR_ROL = {
  cliente:  ['cliente', 'nuevoenvio', 'seguimiento'],
  operador: ['operador'],
  aduana:   ['aduana'],
  almacen:  ['almacen'],
  admin:    ['cliente', 'nuevoenvio', 'seguimiento', 'operador', 'aduana', 'almacen'],
};

export const PAGINA_INICIAL_POR_ROL = {
  cliente: 'cliente',
  operador: 'operador',
  aduana: 'aduana',
  almacen: 'almacen',
  admin: 'cliente',
};

export const NOMBRES_ROL = {
  cliente: 'Cliente',
  operador: 'Operador logístico',
  aduana: 'Agente de aduanas',
  almacen: 'Encargado de almacén',
  admin: 'Administrador',
};
