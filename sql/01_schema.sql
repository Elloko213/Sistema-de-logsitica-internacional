-- ============================================================================
-- SGLI - Sistema de Gestión Logística Internacional
-- 01_schema.sql — Estructura completa de la base de datos (Supabase / PostgreSQL)
-- ============================================================================
-- Ejecutar este archivo completo en: Supabase Dashboard > SQL Editor > New query
-- Orden de ejecución: 01_schema.sql -> 02_rls_policies.sql -> 03_seed_opcional.sql
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PERFILES (usuarios del sistema y su rol)
--    Se apoya en el sistema de autenticación nativo de Supabase (auth.users).
--    Cada usuario autenticado tiene una fila aquí con su rol operativo.
-- ----------------------------------------------------------------------------
create table if not exists public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombres     text not null,
  apellidos   text not null,
  empresa     text,
  correo      text not null unique,
  rol         text not null default 'cliente'
              check (rol in ('cliente','operador','aduana','almacen','admin')),
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.perfiles is 'Perfil y rol operativo de cada usuario autenticado en el sistema.';

-- Trigger: al registrarse un usuario en Supabase Auth, se crea su perfil automáticamente.
-- El rol se toma de los metadatos enviados en el signUp (rol='cliente' por defecto).
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombres, apellidos, empresa, correo, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombres', ''),
    coalesce(new.raw_user_meta_data->>'apellidos', ''),
    new.raw_user_meta_data->>'empresa',
    new.email,
    coalesce(new.raw_user_meta_data->>'rol', 'cliente')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- ----------------------------------------------------------------------------
-- 2. ENVÍOS (tabla principal, ya existente en tu proyecto — se refuerza aquí)
-- ----------------------------------------------------------------------------
create table if not exists public.envios (
  id                uuid primary key default gen_random_uuid(),
  codigo            text not null unique,
  cliente_id        uuid references public.perfiles(id) on delete set null,
  pais_origen       text,
  pais_destino      text,
  ciudad_origen     text,
  ciudad_destino    text,
  mercancia         text,
  transporte        text,
  peso_kg           numeric,
  dimensiones       text,
  fecha_programada  date,
  observaciones     text,
  transportista     text,
  estado            text not null default 'Registrado',
  clase             text not null default 'registrado'
                    check (clase in ('registrado','transito','aduana','almacen','entregado')),
  lat               numeric not null default -16.4897,
  lng               numeric not null default -68.1193,
  ubi_texto         text default 'Almacén de origen',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.envios is 'Envíos internacionales registrados por los clientes.';

-- ----------------------------------------------------------------------------
-- 3. TRANSPORTISTAS (catálogo usado por el operador logístico)
-- ----------------------------------------------------------------------------
create table if not exists public.transportistas (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null,
  contacto  text,
  activo    boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. ASIGNACIONES DE TRANSPORTE (módulo Operador logístico)
-- ----------------------------------------------------------------------------
create table if not exists public.asignaciones_transporte (
  id                uuid primary key default gen_random_uuid(),
  envio_id          uuid not null references public.envios(id) on delete cascade,
  transportista_id  uuid references public.transportistas(id),
  operador_id       uuid references public.perfiles(id),
  fecha_asignacion  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. HISTORIAL DE SEGUIMIENTO / GPS (alimentado por el operador logístico)
-- ----------------------------------------------------------------------------
create table if not exists public.seguimiento_historial (
  id              uuid primary key default gen_random_uuid(),
  envio_id        uuid not null references public.envios(id) on delete cascade,
  estado          text not null,
  clase           text not null,
  ubicacion       text,
  lat             numeric,
  lng             numeric,
  registrado_por  uuid references public.perfiles(id),
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 6. TRÁMITES ADUANEROS (módulo Agente de aduanas)
-- ----------------------------------------------------------------------------
create table if not exists public.tramites_aduana (
  id               uuid primary key default gen_random_uuid(),
  envio_id         uuid not null references public.envios(id) on delete cascade,
  documentacion    text not null,
  estado_tramite   text not null default 'En revisión'
                   check (estado_tramite in ('En revisión','Observado','Liberado')),
  observaciones    text,
  agente_id        uuid references public.perfiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 7. MOVIMIENTOS DE ALMACÉN (módulo Encargado de almacén)
-- ----------------------------------------------------------------------------
create table if not exists public.movimientos_almacen (
  id                  uuid primary key default gen_random_uuid(),
  envio_id            uuid references public.envios(id) on delete set null,
  codigo_envio        text not null,
  tipo_movimiento     text not null check (tipo_movimiento in ('Ingreso','Salida')),
  cantidad            text,
  ubicacion_bodega    text,
  responsable         text,
  encargado_id        uuid references public.perfiles(id),
  created_at          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- ÍNDICES
-- ----------------------------------------------------------------------------
create index if not exists idx_envios_cliente on public.envios(cliente_id);
create index if not exists idx_envios_codigo on public.envios(codigo);
create index if not exists idx_seguimiento_envio on public.seguimiento_historial(envio_id);
create index if not exists idx_tramites_envio on public.tramites_aduana(envio_id);
create index if not exists idx_movimientos_envio on public.movimientos_almacen(envio_id);

-- ----------------------------------------------------------------------------
-- TRIGGER: mantener updated_at actualizado
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_envios_updated_at on public.envios;
create trigger trg_envios_updated_at before update on public.envios
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tramites_updated_at on public.tramites_aduana;
create trigger trg_tramites_updated_at before update on public.tramites_aduana
  for each row execute function public.set_updated_at();
