-- ============================================================================
-- SGLI - 03_seed_opcional.sql
-- Datos de ejemplo opcionales. Puedes omitir este archivo si prefieres
-- empezar con la base de datos vacía.
-- ============================================================================

insert into public.transportistas (nombre, contacto) values
  ('Transportes Andes Ltda.', 'contacto@andes.bo'),
  ('Rutas del Sur S.A.', 'contacto@rutasdelsur.com'),
  ('LogiCarga Bolivia', 'contacto@logicarga.bo')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- CÓMO CREAR USUARIOS DE OPERACIÓN (operador, aduana, almacén, admin)
-- ----------------------------------------------------------------------------
-- Los clientes se registran solos desde el sistema (pantalla "Crear cuenta").
-- El personal interno (operador logístico, agente de aduanas, encargado de
-- almacén, administrador) debe ser creado por ti desde Supabase, así:
--
-- 1. Ve a Authentication > Users > Add user (o invita por correo).
-- 2. Crea el usuario con su correo y contraseña.
-- 3. Ve a Table Editor > perfiles y edita la fila que se creó automáticamente
--    (el trigger la genera sola) y cambia la columna "rol" a uno de:
--       'operador'  |  'aduana'  |  'almacen'  |  'admin'
--
-- También puedes hacerlo con SQL, reemplazando el correo:
--   update public.perfiles set rol = 'operador' where correo = 'operador@sgli.com';
--   update public.perfiles set rol = 'aduana'    where correo = 'aduana@sgli.com';
--   update public.perfiles set rol = 'almacen'   where correo = 'almacen@sgli.com';
