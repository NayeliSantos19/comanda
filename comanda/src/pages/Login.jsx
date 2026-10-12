import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Navegacion from "../components/Navegacion.jsx";
import { HAY_DEMO, CUENTA_DEMO } from "../lib/demo";

// Solo inicio de sesión: las cuentas del personal se crean desde
// Supabase -> Authentication -> Users -> Add user (así nadie se registra como cocinero).
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) {
      setError(error.message.includes("Invalid login credentials") ? "Correo o contraseña incorrectos." : error.message);
      return;
    }
    navigate(location.state?.desde ?? "/cocina", { replace: true });
  }

  return (
    <div className="min-h-screen px-6 py-8 max-w-sm mx-auto flex flex-col">
      <Navegacion ocultarSecciones volverA="/" />
      <div className="flex-grow flex flex-col justify-center">
        <h1 className="font-display text-2xl font-bold">Acceso del personal</h1>
        <p className="text-sm text-muted mt-1.5">Cocina, mesas y menú del restaurante.</p>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          <label className="block">
            <span className="block text-[13px] font-semibold mb-1.5">Correo</span>
            <input
              type="email"
              required
              placeholder="cocina@restaurante.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-line bg-white text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-[13px] font-semibold mb-1.5">Contraseña</span>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-line bg-white text-sm"
            />
          </label>

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="bg-accent text-paper rounded-xl py-3.5 font-semibold text-[15px] disabled:opacity-60"
          >
            {cargando ? "Un momento…" : "Iniciar sesión"}
          </button>
        </form>

        {HAY_DEMO && (
          <div className="mt-6 bg-accentLight rounded-2xl p-4">
            <p className="text-[13px] font-semibold text-accent">¿Solo quieres probar?</p>
            <p className="text-[12px] text-muted mt-1">Usa la cuenta demo, no necesitas registrarte.</p>
            <button
              type="button"
              onClick={() => {
                setEmail(CUENTA_DEMO.email);
                setPassword(CUENTA_DEMO.password);
              }}
              className="mt-3 text-[13px] font-semibold text-accent underline underline-offset-2"
            >
              Llenar con la cuenta demo
            </button>
          </div>
        )}
        <p className="text-[12px] text-muted mt-5 leading-relaxed">
          ¿No tienes cuenta? Pídele al administrador que te cree una.
        </p>
      </div>
    </div>
  );
}
