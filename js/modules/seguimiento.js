import { supabase } from '../supabaseClient.js';
import { sesion } from '../auth.js';

/**
 * Registra el evento solo cuando el trigger de base de datos no lo hizo.
 * La ventana corta evita duplicados entre el trigger y la aplicación.
 */
export async function asegurarEventoSeguimiento({
  envioId, estado, clase, ubicacion, lat = null, lng = null,
}) {
  const desde = new Date(Date.now() - 15000).toISOString();
  const { data, error: errorConsulta } = await supabase
    .from('seguimiento_historial')
    .select('id')
    .eq('envio_id', envioId)
    .eq('estado', estado)
    .eq('clase', clase)
    .eq('ubicacion', ubicacion)
    .gte('created_at', desde)
    .limit(1);

  if (errorConsulta || data?.length) return errorConsulta || null;

  const { error } = await supabase.from('seguimiento_historial').insert([{
    envio_id: envioId,
    estado,
    clase,
    ubicacion,
    lat,
    lng,
    registrado_por: sesion.usuario?.id || null,
  }]);
  return error;
}
