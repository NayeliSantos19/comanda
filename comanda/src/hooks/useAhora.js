import { useEffect, useState } from "react";

// Re-renderiza cada `ms` para que los "hace 5 min" se mantengan al día
export function useAhora(ms = 30000) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return ahora;
}
