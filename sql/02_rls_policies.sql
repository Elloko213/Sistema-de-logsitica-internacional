-- ============================================================================
-- SGLI - 02_rls_policies.sql
-- Seguridad a nivel de fila (RLS): cada rol solo ve/edita lo que le corresponde.
-- Ejecutar DESPUÉS de 01_schema.sql
-- ============================================================================

-- Función auxiliar: devuelve el rol del usuario autenticado actual
create or replace function public.rol_actual()
returns text
language sql stable security definer set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.es_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select rol from public.perfiles where id = auth.uid())
         in ('operador','aduana','almacen','admin'), false);
$$;

-- ----------------------------------------------------------------------------
-- PERFILES
-- ----------------------------------------------------------------------------
alter table public.perfiles enable row level security;

create policy "perfiles_select_propio_o_staff"
  on public.perfiles for select
  using (auth.uid() = id or es_staff());

create policy "perfiles_update_propio"
  on public.perfiles for update
  using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- ENVÍOS
-- ----------------------------------------------------------------------------
alter table public.envios enable row level security;

create policy "envios_select_propio_o_staff"
  on public.envios for select
  using (cliente_id = auth.uid() or es_staff());

create policy "envios_insert_cliente"
  on public.envios for insert
  with check (cliente_id = auth.uid());

create policy "envios_update_staff"
  on public.envios for update
  using (es_staff());

-- ----------------------------------------------------------------------------
-- TRANSPORTISTAS (catálogo, visible para staff; solo operador/admin edita)
-- ----------------------------------------------------------------------------
alter table public.transportistas enable row level security;

create policy "transportistas_select_staff"
  on public.transportistas for select
  using (es_staff());

create policy "transportistas_insert_operador"
  on public.transportistas for insert
  with check (rol_actual() in ('operador','admin'));

-- ----------------------------------------------------------------------------
-- ASIGNACIONES DE TRANSPORTE
-- ----------------------------------------------------------------------------
alter table public.asignaciones_transporte enable row level security;

create policy "asignaciones_select"
  on public.asignaciones_transporte for select
  using (
    es_staff() or exists (
      select 1 from public.envios e
      where e.id = envio_id and e.cliente_id = auth.uid()
    )
  );

create policy "asignaciones_insert_operador"
  on public.asignaciones_transporte for insert
  with check (rol_actual() in ('operador','admin'));

-- ----------------------------------------------------------------------------
-- SEGUIMIENTO / HISTORIAL GPS
-- ----------------------------------------------------------------------------
alter table public.seguimiento_historial enable row level security;

create policy "seguimiento_select"
  on public.seguimiento_historial for select
  using (
    es_staff() or exists (
      select 1 from public.envios e
      where e.id = envio_id and e.cliente_id = auth.uid()
    )
  );

create policy "seguimiento_insert_staff"
  on public.seguimiento_historial for insert
  with check (es_staff());

-- ----------------------------------------------------------------------------
-- TRÁMITES ADUANEROS
-- ----------------------------------------------------------------------------
alter table public.tramites_aduana enable row level security;

create policy "tramites_select"
  on public.tramites_aduana for select
  using (
    es_staff() or exists (
      select 1 from public.envios e
      where e.id = envio_id and e.cliente_id = auth.uid()
    )
  );

create policy "tramites_insert_aduana"
  on public.tramites_aduana for insert
  with check (rol_actual() in ('aduana','admin'));

create policy "tramites_update_aduana"
  on public.tramites_aduana for update
  using (rol_actual() in ('aduana','admin'));

-- ----------------------------------------------------------------------------
-- MOVIMIENTOS DE ALMACÉN
-- ----------------------------------------------------------------------------
alter table public.movimientos_almacen enable row level security;

create policy "movimientos_select"
  on public.movimientos_almacen for select
  using (
    es_staff() or exists (
      select 1 from public.envios e
      where e.id = envio_id and e.cliente_id = auth.uid()
    )
  );

create policy "movimientos_insert_almacen"
  on public.movimientos_almacen for insert
  with check (rol_actual() in ('almacen','admin'));
