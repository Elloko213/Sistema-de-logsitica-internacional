# 📘 Manual de Usuario — SGLI

Este manual explica cómo **ejecutar el sistema** y cómo **probar cada rol**,
pensado para alguien que solo quiere hacerlo correr (por ejemplo, tu
docente) sin tener que configurar nada de Supabase.

---

## 1. Requisitos previos

Solo necesitas tener instalado **Node.js** (que ya incluye `npm`).

- Descárgalo de: https://nodejs.org (elige la versión "LTS").
- Para verificar que quedó instalado, abre una terminal y escribe:
  ```bash
  node -v
  npm -v
  ```
  Si te muestran un número de versión, está listo.

> Si no quieres instalar nada, en la sección 3 hay una alternativa con Python.

---

## 2. Ejecutar el sistema (forma recomendada, con npm)

1. Descarga o clona este repositorio.
2. Abre una terminal **dentro de la carpeta del proyecto** (donde está `index.html`).
3. Ejecuta:
   ```bash
   npm start
   ```
4. La primera vez te pedirá confirmar la descarga de una herramienta
   (`http-server`) — escribe `y` y presiona Enter. Es automático, no se
   instala nada permanente en el proyecto.
5. Se abrirá tu navegador automáticamente en `http://localhost:5500`.
   Si no se abre solo, entra manualmente a esa dirección.

Para detener el servidor, vuelve a la terminal y presiona `Ctrl + C`.

---

## 3. Alternativa sin Node.js (con Python)

La mayoría de computadoras (Mac/Linux) ya traen Python instalado.

```bash
cd carpeta-del-proyecto
python3 -m http.server 5500
```
Luego abre `http://localhost:5500` en el navegador.

---

## 4. Iniciar sesión y probar cada rol

El sistema tiene 4 roles. Usa estas credenciales de prueba
*(el desarrollador del proyecto debe completar esta tabla con cuentas
reales creadas en Supabase antes de la entrega — ver sección 6)*:

| Rol | Correo | Contraseña | Qué vas a ver |
|---|---|---|---|
| Cliente | `cliente.demo@sgli.com` | `demo1234` | Mis envíos, registrar envío, seguimiento GPS |
| Operador logístico | `operador.demo@sgli.com` | `demo1234` | Asignación de transportistas y actualización de ubicación |
| Agente de aduanas | `aduana.demo@sgli.com` | `demo1234` | Registro de trámites aduaneros |
| Encargado de almacén | `almacen.demo@sgli.com` | `demo1234` | Ingresos y salidas de mercancía |

También puedes crear tu propia cuenta de cliente desde
**"Regístrate como cliente"** en la pantalla de inicio de sesión.

---

## 5. Recorrido guiado (flujo completo de un envío)

Para ver el sistema funcionando de punta a punta:

1. **Inicia sesión como Cliente** → ve a "Registrar envío" → completa el
   formulario → confirma. Se genera un código `SGLI-XXXX`.
2. **Cierra sesión** (clic en tu avatar, arriba a la derecha → "Cerrar
   sesión") → **inicia sesión como Operador logístico** → en "Pendientes
   de asignación" busca el envío recién creado → asígnale un
   transportista.
3. **Inicia sesión como Agente de aduanas** → registra un trámite con ese
   código → marca el estado como "Liberado".
4. **Inicia sesión como Encargado de almacén** → registra un "Ingreso"
   con ese código.
5. **Vuelve a iniciar sesión como Cliente** → ve a "Consultar estado" →
   busca el código → verás el mapa y el historial con todos los cambios
   de estado que acabas de generar.

---

## 6. Notas para el desarrollador (antes de la entrega)

- Crea las 4 cuentas de prueba (sección 4) en tu proyecto de Supabase:
  **Authentication → Add user**, y luego en **Table Editor → perfiles**
  cambia la columna `rol` de cada una según corresponda.
- Actualiza la tabla de la sección 4 con las contraseñas reales que
  usaste.
- Corre `sql/01_schema.sql`, `sql/02_rls_policies.sql` y
  `sql/03_seed_opcional.sql` en el SQL Editor de Supabase antes de que
  cualquiera use el sistema.

---

## 7. Problemas comunes

| Problema | Solución |
|---|---|
| La página queda en blanco o da error en la consola sobre `import` | No abriste el proyecto con un servidor local (ver secciones 2 o 3); no funciona con doble clic al `index.html`. |
| "Correo o contraseña incorrectos" | Verifica que la cuenta exista en Supabase y que el rol esté bien asignado en la tabla `perfiles`. |
| El mapa no se ve | Revisa tu conexión a internet (el mapa usa OpenStreetMap en línea). |
| No aparece ningún envío | Asegúrate de haber ejecutado los 3 scripts SQL en Supabase. |
