import { Navigate, useLocation } from "react-router-dom";
import { useSesion } from "../hooks/useSesion";

export default function RutaProtegida({ children }) {
  const { sesion, cargando } = useSesion();
  const location = useLocation();

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Cargando…</div>;
  }
  if (!sesion) {
    return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  }
  return children;
}
