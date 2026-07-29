-- ============================================================================
-- Corrección para instalaciones existentes:
-- permisos de API + trazabilidad automática de envíos.
-- Ejecutar una vez en Supabase > SQL Editor.
-- ============================================================================

grant usage on schema public to authenticated;
grant select, update on public.perfiles to authenticated;
grant select, insert, update on public.envios to authenticated;
grant select, insert, update on public.transportistas to authenticated;
grant select, insert on public.asignaciones_transporte to authenticated;
grant select, insert on public.seguimiento_historial to authenticated;
grant select, insert, update on public.tramites_aduana to authenticated;
grant select, insert on public.movimientos_almacen to authenticated;
grant execute on function public.rol_actual() to authenticated;
grant execute on function public.es_staff() to authenticated;

drop policy if exists "transportistas_update_operador" on public.transportistas;
create policy "transportistas_update_operador"
  on public.transportistas for update
  using (public.rol_actual() in ('operador','admin'));

create or replace function public.registrar_evento_seguimiento()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  debe_registrar boolean := tg_op = 'INSERT';
begin
  if tg_op = 'UPDATE' then
    debe_registrar :=
      new.estado is distinct from old.estado
      or new.ubi_texto is distinct from old.ubi_texto
      or new.lat is distinct from old.lat
      or new.lng is distinct from old.lng;
  end if;

  if debe_registrar then
    insert into public.seguimiento_historial (
      envio_id, estado, clase, ubicacion, lat, lng, registrado_por
    ) values (
      new.id, new.estado, new.clase, new.ubi_texto, new.lat, new.lng, auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_envios_seguimiento on public.envios;
create trigger trg_envios_seguimiento
  after insert or update on public.envios
  for each row execute function public.registrar_evento_seguimiento();

select
  table_name,
  has_table_privilege('authenticated', format('public.%I', table_name), privilegio)
    as permiso_activo
from (
  values
    ('perfiles', 'SELECT'),
    ('envios', 'INSERT'),
    ('transportistas', 'SELECT'),
    ('asignaciones_transporte', 'INSERT'),
    ('seguimiento_historial', 'SELECT'),
    ('tramites_aduana', 'INSERT'),
    ('movimientos_almacen', 'INSERT')
) as permisos(table_name, privilegio);
