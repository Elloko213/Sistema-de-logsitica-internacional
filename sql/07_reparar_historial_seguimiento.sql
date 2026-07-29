-- Repara y completa la trazabilidad de instalaciones existentes.
-- Ejecutar una vez en Supabase > SQL Editor.

grant select, insert on public.seguimiento_historial to authenticated;

drop policy if exists "seguimiento_insert_cliente_inicial"
  on public.seguimiento_historial;
create policy "seguimiento_insert_cliente_inicial"
  on public.seguimiento_historial for insert
  with check (
    estado = 'Registrado'
    and clase = 'registrado'
    and registrado_por = auth.uid()
    and exists (
      select 1 from public.envios e
      where e.id = envio_id and e.cliente_id = auth.uid()
    )
  );

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

-- Crea un punto actual para envíos que nunca recibieron historial.
insert into public.seguimiento_historial (
  envio_id, estado, clase, ubicacion, lat, lng, registrado_por, created_at
)
select
  e.id, e.estado, e.clase, e.ubi_texto, e.lat, e.lng, null, e.updated_at
from public.envios e
where not exists (
  select 1
  from public.seguimiento_historial s
  where s.envio_id = e.id
);

select
  e.codigo,
  count(s.id) as eventos_registrados
from public.envios e
left join public.seguimiento_historial s on s.envio_id = e.id
group by e.id, e.codigo
order by e.codigo;
