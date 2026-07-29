<div align="center">

# 🚢 SGLI — Sistema de Gestión Logística Internacional

**Plataforma web para la trazabilidad de envíos internacionales**, con seguimiento GPS en tiempo real y control de acceso por rol operativo.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/licencia-MIT-blue)

</div>

---

## 📌 Descripción

**SGLI** digitaliza el proceso logístico de una empresa de comercio
internacional: desde que el cliente registra su envío, hasta que un
operador logístico lo asigna a un transportista, un agente de aduanas
libera su documentación y un encargado de almacén lo despacha.

El sistema tiene **4 roles independientes**, cada uno con su propio panel:

| Rol | ¿Qué hace? |
|---|---|
| 👤 **Cliente** | Registra envíos, consulta su estado y ve la ubicación GPS en un mapa. |
| 🚛 **Operador logístico** | Asigna transportistas y actualiza la ubicación/estado del envío. |
| 📋 **Agente de aduanas** | Registra trámites aduaneros y libera la mercancía. |
| 📦 **Encargado de almacén** | Registra ingresos y salidas de mercancía en bodega. |

Toda la información se guarda en una base de datos real (**Supabase /
PostgreSQL**), con seguridad a nivel de fila (**RLS**) para que cada rol
solo pueda ver y modificar lo que le corresponde.

---

## 🖥️ Capturas

> _Agrega aquí 2-3 capturas de pantalla del sistema (login, panel de
> cliente, panel de operador) para que se vea aún mejor. Súbelas a una
> carpeta `docs/capturas/` y enlázalas así:_
>
> `![Panel de cliente](docs/capturas/panel-cliente.png)`

---

## 🏗️ Arquitectura del proyecto

```
SGLI/
├── index.html                  → punto de entrada único (SPA)
├── css/
│   └── estilos.css             → estilos de toda la aplicación
├── js/
│   ├── supabaseClient.js       → conexión a Supabase
│   ├── auth.js                 → login, registro, sesión y roles
│   ├── ui.js                   → utilidades de interfaz (alertas, formato)
│   ├── app.js                  → enrutador SPA + control de acceso por rol
│   └── modules/
│       ├── cliente.js          → envíos, registro y seguimiento GPS
│       ├── operador.js         → asignación de transporte y ubicación
│       ├── aduana.js           → trámites aduaneros
│       └── almacen.js          → movimientos de bodega
├── sql/
│   ├── 01_schema.sql           → creación de tablas
│   ├── 02_rls_policies.sql     → seguridad por rol
│   └── 03_seed_opcional.sql    → datos de ejemplo
├── package.json                → permite ejecutar el proyecto con `npm start`
├── README.md
├── MANUAL_USUARIO.md           → guía paso a paso para ejecutar y probar el sistema
└── LICENSE
```

---

## 🛠️ Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript (ES Modules) — sin frameworks, sin build.
- **Backend / Base de datos:** [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS).
- **Mapas:** [Leaflet.js](https://leafletjs.com) + OpenStreetMap.

---

## 🚀 Cómo ejecutar el proyecto

📘 **¿Solo quieres correr el sistema sin complicarte? Ve directo al [Manual de Usuario](MANUAL_USUARIO.md).**

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU-USUARIO/TU-REPOSITORIO.git
cd TU-REPOSITORIO
```

### 2. Configurar la base de datos
En tu proyecto de Supabase, abre **SQL Editor** y ejecuta en orden:
1. `sql/01_schema.sql`
2. `sql/02_rls_policies.sql`
3. `sql/03_seed_opcional.sql` (opcional)

### 3. Levantar el sistema localmente
El proyecto usa módulos de JavaScript, así que no se puede abrir con
doble clic — necesita un servidor local. Con Node.js instalado:

```bash
npm start
```
Esto levanta el proyecto en **http://localhost:5500** y abre el navegador
automáticamente (usa `http-server` vía `npx`, sin instalar nada
permanente en el proyecto).

Alternativa sin Node.js:
```bash
python3 -m http.server 5500
```
> 💡 También puedes usar la extensión **Live Server** de VS Code.

### 4. Crear usuarios de operación
Los clientes se registran solos desde el sistema. El personal interno
(operador, aduana, almacén) se crea desde **Authentication → Users** en
Supabase y luego se le asigna su rol en la tabla `perfiles`.

Instrucciones detalladas en [`sql/03_seed_opcional.sql`](sql/03_seed_opcional.sql).

### Credenciales de administrador

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@gmail.com` | `123456` |

> ⚠️ Cuenta de demostración. Cambia esta contraseña antes de publicar o usar
> el sistema en producción.

---

## 🔐 Seguridad

El control de acceso no depende solo del frontend: las políticas **RLS**
de `sql/02_rls_policies.sql` garantizan a nivel de base de datos que,
por ejemplo, un cliente nunca pueda leer los envíos de otro cliente, o
que solo un agente de aduanas pueda liberar un trámite.

---

## 👥 Autor(es)

- Nombre del/los estudiante(s) — Proyecto académico de Sistemas de Información Logística.

---

## 📄 Licencia

Este proyecto se distribuye bajo la licencia MIT — ver [`LICENSE`](LICENSE).
