// ============================================================================
// app.js — Enrutador principal, control de acceso por rol y arranque
// ============================================================================
import { supabase } from './supabaseClient.js';
import {
  sesion, restaurarSesion, iniciarSesion, registrarCliente, cerrarSesion,
  PAGINAS_POR_ROL, PAGINA_INICIAL_POR_ROL, NOMBRES_ROL,
} from './auth.js';
import { notificar } from './ui.js';

import * as Cliente from './modules/cliente.js';
import * as Operador from './modules/operador.js';
import * as Aduana from './modules/aduana.js';
import * as Almacen from './modules/almacen.js';

const titulos = {
  login:       ['Iniciar sesión', 'Visitante'],
  registro:    ['Registro de cliente', 'Visitante'],
  cliente:     ['Mis envíos', 'Cliente'],
  nuevoenvio:  ['Registrar nuevo envío', 'Cliente'],
  seguimiento: ['Consultar estado de envío', 'Cliente'],
  operador:    ['Panel de operador logístico', 'Operador logístico'],
  aduana:      ['Panel de agente de aduanas', 'Agente de aduanas'],
  almacen:     ['Panel de encargado de almacén', 'Encargado de almacén'],
};

// Expone algunas funciones que se usan desde atributos onclick del HTML
window.SGLI = {
  goTo,
  irASeguimiento(codigo) {
    goTo('seguimiento');
    const input = document.getElementById('input-track');
    if (input) input.value = codigo;
    Cliente.buscarEnvio();
  },
};

// ---------------------------------------------------------------- Navegación
export function goTo(pagina) {
  const rol = sesion.perfil?.rol;

  // Control de acceso: si no hay sesión, solo se permite login/registro
  if (!rol && !['login', 'registro'].includes(pagina)) {
    pagina = 'login';
  }
  // Si hay sesión, se restringe a las páginas permitidas para su rol
  if (rol && !PAGINAS_POR_ROL[rol]?.includes(pagina)) {
    pagina = PAGINA_INICIAL_POR_ROL[rol];
  }

  const destino = document.getElementById('page-' + pagina);
  if (!destino) return;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  destino.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-page="${pagina}"]`)?.classList.add('active');

  if (titulos[pagina]) {
    document.getElementById('topbarTitle').textContent = titulos[pagina][0];
    document.getElementById('topbarRole').textContent = rol ? NOMBRES_ROL[rol] : titulos[pagina][1];
  }
  document.querySelector('.content').scrollTop = 0;

  inicializarPagina(pagina);
}

function inicializarPagina(pagina) {
  switch (pagina) {
    case 'cliente':
      Cliente.cargarMisEnvios();
      break;
    case 'nuevoenvio':
      Cliente.inicializarFormularioEnvio();
      break;
    case 'seguimiento':
      Cliente.inicializarSeguimiento();
      break;
    case 'operador':
      Operador.inicializarPanelOperador();
      break;
    case 'aduana':
      Aduana.inicializarPanelAduana();
      break;
    case 'almacen':
      Almacen.inicializarPanelAlmacen();
      break;
  }
}

// -------------------------------------------------------- Sidebar según rol
function actualizarSidebarPorRol() {
  const rol = sesion.perfil?.rol;
  document.querySelectorAll('.nav-group-title, .nav-item').forEach(el => el.classList.add('oculto'));

  if (!rol) return;

  const permitidas = PAGINAS_POR_ROL[rol] || [];
  permitidas.forEach(pagina => {
    document.querySelector(`.nav-item[data-page="${pagina}"]`)?.classList.remove('oculto');
  });

  // Muestra el título del grupo (Cliente / Operación) solo si tiene algo visible dentro
  document.querySelectorAll('.nav-group-title').forEach(titulo => {
    const grupo = [];
    let siguiente = titulo.nextElementSibling;
    while (siguiente && siguiente.classList.contains('nav-item')) {
      grupo.push(siguiente);
      siguiente = siguiente.nextElementSibling;
    }
    if (grupo.some(el => !el.classList.contains('oculto'))) titulo.classList.remove('oculto');
  });
}

function actualizarTarjetaUsuario() {
  const perfil = sesion.perfil;
  const avatar = document.getElementById('avatarUsuario');
  const menu = document.getElementById('userDropdownInfo');
  if (!perfil) return;
  const iniciales = ((perfil.nombres?.[0] || '') + (perfil.apellidos?.[0] || '')).toUpperCase() || 'U';
  if (avatar) avatar.textContent = iniciales;
  if (menu) {
    menu.innerHTML = `<strong>${perfil.nombres} ${perfil.apellidos}</strong><span>${perfil.correo}</span>`;
  }
}

// ----------------------------------------------------------------- Sesión UI
async function alIniciarSesionExitosa() {
  actualizarSidebarPorRol();
  actualizarTarjetaUsuario();
  goTo(PAGINA_INICIAL_POR_ROL[sesion.perfil.rol]);
}

function limpiarFormulario(id) {
  document.getElementById(id)?.reset?.();
}

function mostrarMensajeForm(idContenedor, mensaje, tipo) {
  const el = document.getElementById(idContenedor);
  if (!el) return;
  el.textContent = mensaje;
  el.className = `form-msg ${tipo}`;
  el.classList.remove('oculto');
}

function ocultarMensajeForm(idContenedor) {
  document.getElementById(idContenedor)?.classList.add('oculto');
}

// ------------------------------------------------------------------- Eventos
function enlazarEventos() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => goTo(item.dataset.page));
  });

  document.querySelectorAll('.pill-tabs').forEach(group => {
    group.querySelectorAll('.pill-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        group.querySelectorAll('.pill-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  });

  // ---- Login
  const formLogin = document.getElementById('form-login');
  formLogin?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    ocultarMensajeForm('login-msg');
    const correo = document.getElementById('login-correo').value.trim();
    const contrasena = document.getElementById('login-contrasena').value;
    const boton = document.getElementById('btn-login');
    const perfil = await iniciarSesion(correo, contrasena, boton);
    if (perfil) {
      notificar(`Bienvenido/a, ${perfil.nombres}.`, 'exito');
      alIniciarSesionExitosa();
    }
  });

  // ---- Registro
  const formRegistro = document.getElementById('form-registro');
  formRegistro?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    ocultarMensajeForm('registro-msg');
    const nombres = document.getElementById('reg-nombres').value.trim();
    const apellidos = document.getElementById('reg-apellidos').value.trim();
    const empresa = document.getElementById('reg-empresa').value.trim();
    const correo = document.getElementById('reg-correo').value.trim();
    const contrasena = document.getElementById('reg-contrasena').value;
    const confirmar = document.getElementById('reg-confirmar').value;
    const boton = document.getElementById('btn-registro');

    if (contrasena !== confirmar) {
      mostrarMensajeForm('registro-msg', 'Las contraseñas no coinciden.', 'error');
      return;
    }
    if (contrasena.length < 6) {
      mostrarMensajeForm('registro-msg', 'La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }

    const resultado = await registrarCliente({ nombres, apellidos, empresa, correo, contrasena }, boton);
    if (resultado) {
      if (resultado.session) {
        notificar('Cuenta creada correctamente.', 'exito');
        alIniciarSesionExitosa();
      } else {
        mostrarMensajeForm('registro-msg', 'Cuenta creada. Revisa tu correo para confirmar antes de iniciar sesión.', 'exito');
        limpiarFormulario('form-registro');
        goTo('login');
      }
    }
  });

  // ---- Logout
  document.getElementById('avatarUsuario')?.addEventListener('click', () => {
    document.getElementById('userDropdown')?.classList.toggle('oculto');
  });
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await cerrarSesion();
    actualizarSidebarPorRol();
    document.getElementById('userDropdown')?.classList.add('oculto');
    goTo('login');
  });
}

// -------------------------------------------------------------------- Arranque
window.addEventListener('DOMContentLoaded', async () => {
  enlazarEventos();

  const perfil = await restaurarSesion();
  if (perfil) {
    actualizarSidebarPorRol();
    actualizarTarjetaUsuario();
    goTo(PAGINA_INICIAL_POR_ROL[perfil.rol]);
  } else {
    goTo('login');
  }

  // Escucha cambios de sesión (p.ej. token expirado, logout en otra pestaña)
  supabase.auth.onAuthStateChange((evento) => {
    if (evento === 'SIGNED_OUT') {
      actualizarSidebarPorRol();
      goTo('login');
    }
  });
});
