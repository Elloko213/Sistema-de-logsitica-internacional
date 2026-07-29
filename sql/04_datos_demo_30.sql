-- ============================================================================
-- SGLI - 30 envíos de demostración con datos para todos los módulos
-- Ejecutar después de 01_schema.sql, 02_rls_policies.sql y crear los perfiles.
-- Puede ejecutarse varias veces sin duplicar los datos SGLI-DEMO-*.
-- ============================================================================

do $$
declare
  correo text;
begin
  foreach correo in array array[
    'cliente01@gmail.com',
    'operador01@gmail.com',
    'aduana01@gmail.com',
    'almacen01@gmail.com'
  ]
  loop
    if not exists (
      select 1 from public.perfiles where lower(perfiles.correo) = correo
    ) then
      raise exception 'Falta el perfil % en public.perfiles', correo;
    end if;
  end loop;
end
$$;

insert into public.transportistas (nombre, contacto)
select
  format('Transportista Demo %s', lpad(n::text, 2, '0')),
  format('transporte%s@example.com', lpad(n::text, 2, '0'))
from generate_series(1, 10) n
where not exists (
  select 1
  from public.transportistas t
  where t.nombre = format('Transportista Demo %s', lpad(n::text, 2, '0'))
);

insert into public.envios (
  codigo,
  cliente_id,
  pais_origen,
  pais_destino,
  ciudad_origen,
  ciudad_destino,
  mercancia,
  transporte,
  peso_kg,
  dimensiones,
  fecha_programada,
  observaciones,
  transportista,
  estado,
  clase,
  lat,
  lng,
  ubi_texto
)
select
  format('SGLI-DEMO-%s', lpad(n::text, 3, '0')),
  cliente.id,
  (array['Bolivia','Chile','Perú','Argentina','Brasil'])[((n - 1) % 5) + 1],
  (array['Chile','Perú','Argentina','Brasil','Bolivia'])[((n - 1) % 5) + 1],
  (array['La Paz','Santa Cruz','Cochabamba','Oruro','Sucre'])[((n - 1) % 5) + 1],
  (array['Santiago','Lima','Buenos Aires','São Paulo','La Paz'])[((n - 1) % 5) + 1],
  (array['Textiles','Electrónicos','Repuestos','Alimentos','Maquinaria'])[((n - 1) % 5) + 1],
  (array['Terrestre','Aéreo','Marítimo'])[((n - 1) % 3) + 1],
  100 + (n * 37.5),
  format('%sx%sx%s cm', 40 + n, 30 + n, 20 + n),
  current_date + n,
  format('Envío de demostración número %s', n),
  format('Transportista Demo %s', lpad((((n - 1) % 10) + 1)::text, 2, '0')),
  (array['Registrado','En tránsito','En aduana','En almacén','Entregado'])[((n - 1) % 5) + 1],
  (array['registrado','transito','aduana','almacen','entregado'])[((n - 1) % 5) + 1],
  -16.4897 + (n * 0.01),
  -68.1193 + (n * 0.01),
  (array[
    'Almacén de origen',
    'Ruta internacional',
    'Puesto fronterizo',
    'Bodega central',
    'Destino final'
  ])[((n - 1) % 5) + 1]
from generate_series(1, 30) n
cross join lateral (
  select id
  from public.perfiles
  where lower(correo) = 'cliente01@gmail.com'
  limit 1
) cliente
on conflict (codigo) do update set
  cliente_id       = excluded.cliente_id,
  pais_origen      = excluded.pais_origen,
  pais_destino     = excluded.pais_destino,
  ciudad_origen    = excluded.ciudad_origen,
  ciudad_destino   = excluded.ciudad_destino,
  mercancia        = excluded.mercancia,
  transporte       = excluded.transporte,
  peso_kg          = excluded.peso_kg,
  dimensiones      = excluded.dimensiones,
  fecha_programada = excluded.fecha_programada,
  observaciones    = excluded.observaciones,
  transportista    = excluded.transportista,
  estado           = excluded.estado,
  clase            = excluded.clase,
  lat              = excluded.lat,
  lng              = excluded.lng,
  ubi_texto        = excluded.ubi_texto;

insert into public.asignaciones_transporte (
  envio_id,
  transportista_id,
  operador_id
)
select e.id, t.id, operador.id
from public.envios e
join public.transportistas t
  on t.nombre = format(
    'Transportista Demo %s',
    lpad((((right(e.codigo, 3)::int - 1) % 10) + 1)::text, 2, '0')
  )
cross join lateral (
  select id
  from public.perfiles
  where lower(correo) = 'operador01@gmail.com'
  limit 1
) operador
where e.codigo like 'SGLI-DEMO-%'
  and not exists (
    select 1
    from public.asignaciones_transporte a
    where a.envio_id = e.id
  );

insert into public.seguimiento_historial (
  envio_id,
  estado,
  clase,
  ubicacion,
  lat,
  lng,
  registrado_por
)
select
  e.id,
  e.estado,
  e.clase,
  e.ubi_texto,
  e.lat,
  e.lng,
  operador.id
from public.envios e
cross join lateral (
  select id
  from public.perfiles
  where lower(correo) = 'operador01@gmail.com'
  limit 1
) operador
where e.codigo like 'SGLI-DEMO-%'
  and not exists (
    select 1
    from public.seguimiento_historial s
    where s.envio_id = e.id
  );

insert into public.tramites_aduana (
  envio_id,
  documentacion,
  estado_tramite,
  observaciones,
  agente_id
)
select
  e.id,
  format('Factura comercial y declaración del envío %s', e.codigo),
  (array['En revisión','Observado','Liberado'])[
    ((right(e.codigo, 3)::int - 1) % 3) + 1
  ],
  'Trámite de demostración',
  aduana.id
from public.envios e
cross join lateral (
  select id
  from public.perfiles
  where lower(correo) = 'aduana01@gmail.com'
  limit 1
) aduana
where e.codigo like 'SGLI-DEMO-%'
  and not exists (
    select 1
    from public.tramites_aduana a
    where a.envio_id = e.id
  );

insert into public.movimientos_almacen (
  envio_id,
  codigo_envio,
  tipo_movimiento,
  cantidad,
  ubicacion_bodega,
  responsable,
  encargado_id
)
select
  e.id,
  e.codigo,
  case when right(e.codigo, 3)::int % 2 = 0 then 'Salida' else 'Ingreso' end,
  format('%s bultos', 1 + (right(e.codigo, 3)::int % 12)),
  format(
    'Bodega %s-%s',
    chr(65 + (right(e.codigo, 3)::int % 4)),
    1 + (right(e.codigo, 3)::int % 10)
  ),
  'Encargado de almacén demo',
  almacen.id
from public.envios e
cross join lateral (
  select id
  from public.perfiles
  where lower(correo) = 'almacen01@gmail.com'
  limit 1
) almacen
where e.codigo like 'SGLI-DEMO-%'
  and not exists (
    select 1
    from public.movimientos_almacen m
    where m.envio_id = e.id
  );

select 'envios' as tabla, count(*) as registros
from public.envios where codigo like 'SGLI-DEMO-%'
union all
select 'asignaciones_transporte', count(*)
from public.asignaciones_transporte a
join public.envios e on e.id = a.envio_id
where e.codigo like 'SGLI-DEMO-%'
union all
select 'seguimiento_historial', count(*)
from public.seguimiento_historial s
join public.envios e on e.id = s.envio_id
where e.codigo like 'SGLI-DEMO-%'
union all
select 'tramites_aduana', count(*)
from public.tramites_aduana a
join public.envios e on e.id = a.envio_id
where e.codigo like 'SGLI-DEMO-%'
union all
select 'movimientos_almacen', count(*)
from public.movimientos_almacen m
join public.envios e on e.id = m.envio_id
where e.codigo like 'SGLI-DEMO-%';
