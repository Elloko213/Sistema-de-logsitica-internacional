// ============================================================================
// supabaseClient.js
// Punto único de conexión a Supabase. Todos los demás módulos importan
// el cliente desde aquí — así solo hay un lugar donde configurar las llaves.
// ============================================================================

// ⚠️ Reemplaza estos valores por los de TU proyecto de Supabase
// (Project Settings > API). El "anon key" es seguro de exponer en el
// frontend: el acceso real se controla con las políticas RLS del backend.
const SUPABASE_URL = 'https://gkhvqgrvjgzutpfzijxr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdraHZxZ3J2amd6dXRwZnppanhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxOTI4NzksImV4cCI6MjEwMDc2ODg3OX0.TOk5JQZvCQFEx_2ioxJY3Rriw7m0sl83pLlaoQtpIRg';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
