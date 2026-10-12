import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Categorías con sus platos, en orden. El menú es público (no requiere sesión).
export function useMenu() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    const consulta = (columnas) =>
      supabase
        .from("categorias")
        .select(`id, nombre, orden, platos(${columnas})`)
        .order("orden")
        .order("orden", { referencedTable: "platos" });

    const columnas = "id, nombre, descripcion, precio, disponible, orden, categoria_id";
    let { data, error } = await consulta(`${columnas}, imagen_url`);
    // Si todavía no se corrió supabase-fotos.sql, el menú sigue funcionando sin fotos
    if (error && error.message.includes("imagen_url")) {
      ({ data, error } = await consulta(columnas));
    }

    if (error) setError(error.message);
    else {
      setCategorias(data);
      setError(null);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
    const alVolver = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [cargar]);

  return { categorias, cargando, error, recargar: cargar };
}
