// ============================================================================
// supabaseClient.js
// Punto único de conexión a Supabase. Todos los demás módulos importan
// el cliente desde aquí — así solo hay un lugar donde configurar las llaves.
// ============================================================================

// ⚠️ Reemplaza estos valores por los de TU proyecto de Supabase
// (Project Settings > API). El "anon key" es seguro de exponer en el
// frontend: el acceso real se controla con las políticas RLS del backend.
const SUPABASE_URL = 'https://euxjndjpfsudvltldobd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1eGpuZGpwZnN1ZHZsdGxkb2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTY1NjcsImV4cCI6MjEwMDgzMjU2N30.aG-JnnPenOEC2MqXjlUap4_FWGDezbTAxDBVAJSpdFM';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
