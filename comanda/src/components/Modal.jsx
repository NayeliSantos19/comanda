import { useEffect } from "react";

// Ventana sencilla: en el celular sube desde abajo, en pantallas grandes queda al centro.
export default function Modal({ abierto, onCerrar, titulo, children, ancho = "max-w-md" }) {
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alTeclear);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40 no-imprimir" onClick={onCerrar} />
      <div
        className={`relative w-full ${ancho} bg-paper rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto animate-subir sm:animate-pop-in`}
      >
        <div className="sticky top-0 bg-paper/95 backdrop-blur px-5 pt-5 pb-3 flex items-center justify-between gap-3 no-imprimir">
          <h2 className="font-display text-lg font-bold">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-xl border border-line bg-white flex items-center justify-center hover:border-accent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
