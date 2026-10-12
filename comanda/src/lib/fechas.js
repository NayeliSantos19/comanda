// Zona horaria del restaurante. Debe coincidir con hoy_local() en supabase-schema.sql
export const ZONA_HORARIA = "America/El_Salvador";

// "2026-10-12" según la hora local del restaurante
export function hoyLocal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function hora(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("es-SV", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA_HORARIA,
  });
}

export function minutosDesde(ts, ahora = Date.now()) {
  return Math.max(0, Math.floor((ahora - new Date(ts)) / 60000));
}

export function hace(ts, ahora) {
  const m = minutosDesde(ts, ahora);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h ${m % 60} min`;
}
