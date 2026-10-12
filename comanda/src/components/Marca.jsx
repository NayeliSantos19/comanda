import { Link } from "react-router-dom";

export default function Marca({ oscuro = false, enlace = true }) {
  const contenido = (
    <>
      <span className="w-8 h-8 rounded-lg bg-accent text-paper font-display font-bold text-[15px] flex items-center justify-center">
        C
      </span>
      <span className={`font-display font-bold text-lg ${oscuro ? "text-paper" : "text-ink"}`}>Comanda</span>
    </>
  );
  if (!enlace) return <span className="inline-flex items-center gap-2">{contenido}</span>;
  return (
    <Link to="/" className="inline-flex items-center gap-2">
      {contenido}
    </Link>
  );
}
