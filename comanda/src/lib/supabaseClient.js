import { createClient } from "@supabase/supabase-js";

// Estas dos variables vienen del archivo .env (nunca se suben a GitHub).
// Las obtienes en Supabase: Settings -> API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Faltan las variables de entorno de Supabase. Revisa tu archivo .env (usa .env.example como guía)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
