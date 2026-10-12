import { ESTADOS } from "../lib/estados";

export default function EstadoPedido({ estado }) {
  const e = ESTADOS[estado] ?? ESTADOS.recibido;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${e.clase}`}>
      {e.nombre}
    </span>
  );
}
