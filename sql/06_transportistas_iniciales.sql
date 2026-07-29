-- Catálogo mínimo para poder asignar transportistas desde el panel operador.
-- Puede ejecutarse varias veces sin duplicar nombres.

insert into public.transportistas (nombre, contacto, activo)
select nombre, contacto, true
from (
  values
    ('Transportes Andes Ltda.', 'contacto@andes.bo'),
    ('Rutas del Sur S.A.', 'contacto@rutasdelsur.com'),
    ('LogiCarga Bolivia', 'contacto@logicarga.bo'),
    ('Carga Express Internacional', 'operaciones@cargaexpress.com'),
    ('TransBol Logística', 'despacho@transbol.bo')
) as catalogo(nombre, contacto)
where not exists (
  select 1
  from public.transportistas t
  where lower(t.nombre) = lower(catalogo.nombre)
);

grant select, insert, update on public.transportistas to authenticated;

select nombre, contacto, activo
from public.transportistas
where activo = true
order by nombre;
