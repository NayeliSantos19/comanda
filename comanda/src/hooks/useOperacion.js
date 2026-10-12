import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { hoyLocal } from "../lib/fechas";

// Para el personal: pedidos de hoy + mesas, al día en tiempo real.
// Cada cambio en las tablas dispara una recarga (simple y siempre consistente).
export function useOperacion() {
  const [pedidos, setPedidos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const temporizador = useRef(null);

  const cargar = useCallback(async () => {
    const [p, m] = await Promise.all([
      supabase
        .from("pedidos")
        .select("*, mesa:mesas(id, nombre), items:pedido_items(id, nombre, cantidad, precio_unitario, nota)")
        .eq("fecha", hoyLocal())
        .order("creado_en", { ascending: true })
        .order("id", { referencedTable: "pedido_items" }),
      supabase.from("mesas").select("*").order("orden").order("nombre"),
    ]);

    const err = p.error || m.error;
    if (err) setError(err.message);
    else {
      setPedidos(p.data);
      setMesas(m.data);
      setError(null);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();

    const recargarPronto = () => {
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(cargar, 200);
    };

    const canal = supabase
      .channel(`operacion-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, recargarPronto)
      .on("postgres_changes", { event: "*", schema: "public", table: "mesas" }, recargarPronto)
      .subscribe();

    // Respaldo por si se pierde la conexión en tiempo real
    const intervalo = setInterval(cargar, 30000);
    const alVolver = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      supabase.removeChannel(canal);
      clearInterval(intervalo);
      clearTimeout(temporizador.current);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  return { pedidos, mesas, cargando, error, recargar: cargar };
}
