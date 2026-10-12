import { useState } from "react";
import { fotoUrl } from "../lib/fotos";

// Foto redonda del plato. Si no tiene foto (o no carga), muestra las iniciales en un círculo de color.
export default function FotoPlato({ plato, tam = 112, ancho = 400, color = "bg-peach text-terra", className = "" }) {
  const [fallo, setFallo] = useState(false);
  const url = fotoUrl(plato.imagen_url, ancho);
  const estilo = { width: tam, height: tam };

  if (!url || fallo) {
    return (
      <span
        style={estilo}
        className={`rounded-full flex items-center justify-center font-hero font-extrabold shrink-0 ${color} ${className}`}
        aria-hidden="true"
      >
        <span style={{ fontSize: tam * 0.3 }}>{plato.nombre.slice(0, 2)}</span>
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={plato.nombre}
      loading="lazy"
      onError={() => setFallo(true)}
      style={estilo}
      className={`rounded-full object-cover shrink-0 bg-line ${className}`}
    />
  );
}
