import { supabase } from "./supabaseClient";

// Código de la mesa de prueba (se crea en supabase-schema.sql)
export const MESA_DEMO = "demo";

// Cuenta pública para que cualquiera pruebe la cocina.
// Se configura con VITE_DEMO_EMAIL y VITE_DEMO_PASSWORD (en .env y en Vercel).
export const CUENTA_DEMO = {
  email: import.meta.env.VITE_DEMO_EMAIL,
  password: import.meta.env.VITE_DEMO_PASSWORD,
};
export const HAY_DEMO = Boolean(CUENTA_DEMO.email && CUENTA_DEMO.password);

export async function entrarComoDemo() {
  const { error } = await supabase.auth.signInWithPassword(CUENTA_DEMO);
  if (error) throw new Error("No se pudo entrar con la cuenta demo. Revisa que exista en Supabase.");
}
