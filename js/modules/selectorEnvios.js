import { supabase } from '../supabaseClient.js';

/** Carga en un select los envíos que todavía no fueron entregados. */
export async function cargarSelectorEnviosActivos(idSelect) {
  const select = document.getElementById(idSelect);
  if (!select) return;

  const valorActual = select.value;
  select.disabled = true;
  select.replaceChildren(new Option('Cargando envíos activos…', ''));

  const { data, error } = await supabase
    .from('envios')
    .select('codigo, ciudad_origen, ciudad_destino, estado')
    .neq('clase', 'entregado')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error cargando envíos activos:', error);
    select.replaceChildren(new Option('No se pudieron cargar los envíos', ''));
    return;
  }

  select.replaceChildren(new Option(
    data.length ? `Selecciona un envío activo (${data.length})` : 'No hay envíos activos',
    '',
  ));
  data.forEach(envio => {
    const ruta = `${envio.ciudad_origen || 'Sin origen'} → ${envio.ciudad_destino || 'Sin destino'}`;
    select.add(new Option(`${envio.codigo} — ${ruta} · ${envio.estado}`, envio.codigo));
  });
  select.disabled = !data.length;
  if (data.some(envio => envio.codigo === valorActual)) select.value = valorActual;
}
