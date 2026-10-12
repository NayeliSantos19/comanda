import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  ChefHat,
  ConciergeBell,
  FileText,
  Leaf,
  Lightbulb,
  QrCode,
  ShoppingCart,
  Smartphone,
  UserRound,
  Utensils,
} from "lucide-react";
import Marca from "../components/Marca.jsx";
import { useSesion } from "../hooks/useSesion";
import { HAY_DEMO, MESA_DEMO, entrarComoDemo } from "../lib/demo";

// Foto: "sangsang pic" en Unsplash (licencia gratuita de Unsplash).
// Para usar una foto tuya, ponla en /public/hero.jpg y cambia esta línea por "/hero.jpg".
const FOTO_HERO = "https://images.unsplash.com/photo-1713949215217-8ce60dfc93e7?auto=format&fit=crop&w=1800&q=80";

const PASOS = [
  {
    titulo: "Escanea",
    texto: "Cada mesa tiene su QR. El cliente abre el menú en su celular, sin instalar nada.",
    Icono: Smartphone,
    circulo: "bg-mintLight text-mint",
    numero: "bg-mintLight text-mint",
  },
  {
    titulo: "Pide",
    texto: "Arma su pedido, agrega notas (“sin curtido”) y lo manda directo a cocina.",
    Icono: ShoppingCart,
    circulo: "bg-peach text-terra",
    numero: "bg-peach text-terra",
  },
  {
    titulo: "Sigue",
    texto: "Ve en vivo cuando lo están preparando y cuando va en camino. Pide la cuenta con un toque.",
    Icono: ConciergeBell,
    circulo: "bg-roseLight text-rose",
    numero: "bg-roseLight text-rose",
  },
];

const PERSONAL = [
  {
    ruta: "/cocina",
    titulo: "Cocina",
    texto: "Pedidos en vivo por columnas, con alerta sonora y tiempo de espera.",
    Icono: ChefHat,
    color: "bg-mintLight text-mint",
  },
  {
    ruta: "/mesas",
    titulo: "Mesas",
    texto: "Cuentas abiertas, llamados al mesero, cobro y QR para imprimir.",
    Icono: IconoMesa,
    color: "bg-peach text-terra",
  },
  {
    ruta: "/menu",
    titulo: "Menú",
    texto: "Precios, platos nuevos y botón de “agotado” al instante.",
    Icono: FileText,
    color: "bg-roseLight text-rose",
  },
];

export default function Inicio() {
  const { sesion } = useSesion();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [entrando, setEntrando] = useState(false);
  const urlDemo = `${window.location.origin}/mesa/${MESA_DEMO}`;

  async function probarCocina() {
    if (sesion || !HAY_DEMO) return navigate("/cocina");
    setError(null);
    setEntrando(true);
    try {
      await entrarComoDemo();
      navigate("/cocina");
    } catch (e) {
      setError(e.message);
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1] overflow-x-hidden">
      {/* ───────── Portada con foto ───────── */}
      <div className="relative">
        {/* Foto de fondo a la derecha, se desvanece hacia el texto */}
        <div className="absolute inset-y-0 right-0 w-full lg:w-[58%] pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* El plato queda a la derecha de la tarjeta del QR, como en el diseño */}
            <img
              src={FOTO_HERO}
              alt=""
              className="absolute max-w-none w-auto h-[112%] top-[-4%] right-[-60%] hidden lg:block"
              style={{
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, #000 22%)",
                maskImage: "linear-gradient(to right, transparent 0%, #000 22%)",
              }}
            />
            <img src={FOTO_HERO} alt="" className="absolute inset-0 w-full h-full object-cover lg:hidden" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#FBF7F1] via-[#FBF7F1]/70 to-transparent lg:via-[#FBF7F1]/10" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#FBF7F1] to-transparent" />
          <div className="absolute inset-0 bg-[#FBF7F1]/60 lg:hidden" />
        </div>

        {/* Barra superior */}
        <header className="relative z-20 bg-white/85 backdrop-blur-md border-b border-black/5 shadow-[0_1px_12px_rgba(0,0,0,0.04)]">
          <div className="max-w-[1464px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
            <Marca />
            <Link
              to={sesion ? "/cocina" : "/login"}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white border border-line shadow-sm text-[14px] font-medium text-ink hover:border-forest transition"
            >
              <UserRound size={18} strokeWidth={1.8} />
              {sesion ? "Ir a cocina" : "Acceso del personal"}
            </Link>
          </div>
        </header>

        <section className="relative z-10 max-w-[1464px] mx-auto px-5 sm:px-8 pt-7 pb-10 lg:pb-9 grid gap-10 lg:grid-cols-[1fr_1fr] items-center">
          <div className="animate-fade-in-up">
            <span className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-peach text-terra text-[12px] font-bold uppercase tracking-[0.08em]">
              <Utensils size={16} strokeWidth={2.2} />
              Pedidos desde la mesa
            </span>

            <h1 className="font-hero font-extrabold text-forest text-[2.6rem] sm:text-[3.4rem] lg:text-[3.75rem] leading-[1.02] tracking-[-0.02em] mt-5">
              Escanea, pide y la cocina lo recibe <span className="text-terra">al instante.</span>
            </h1>

            <p className="text-[#6F6C66] text-[17px] leading-relaxed mt-5 max-w-[600px]">
              Comanda conecta las mesas de un restaurante con la cocina: el cliente pide desde su celular con el QR
              de la mesa y el personal ve cada pedido en tiempo real, de “recibido” a “entregado”.
            </p>

            <div className="mt-7 flex flex-wrap gap-4">
              <Link
                to={`/mesa/${MESA_DEMO}`}
                className="group inline-flex items-center gap-3 pl-7 pr-6 py-4 rounded-xl bg-forest text-white font-semibold text-[16px] shadow-[0_8px_20px_rgba(23,61,50,0.25)] hover:bg-[#1F4B3F] transition"
              >
                <QrCode size={22} strokeWidth={1.9} />
                Probar como cliente
                <ArrowRight size={19} className="ml-2 transition group-hover:translate-x-0.5" />
              </Link>
              <button
                type="button"
                onClick={probarCocina}
                disabled={entrando}
                className="group inline-flex items-center gap-3 pl-6 pr-6 py-4 rounded-xl bg-white border border-[#DCD6CC] text-ink font-semibold text-[16px] hover:border-forest transition disabled:opacity-60"
              >
                <ChefHat size={22} strokeWidth={1.8} />
                {entrando ? "Entrando…" : sesion ? "Ver la cocina" : "Probar como cocina"}
                <ArrowRight size={19} className="ml-4 transition group-hover:translate-x-0.5" />
              </button>
            </div>
            {error && <p className="text-[13px] text-red-600 mt-3">{error}</p>}

            <p className="flex items-center gap-2 text-[14px] text-[#7C7870] mt-5">
              <Lightbulb size={17} className="text-terra shrink-0" strokeWidth={1.9} />
              Tip: abre la mesa en tu celular y la cocina en la computadora para verlo en vivo.
            </p>
          </div>

          {/* Tarjeta del QR */}
          <div className="relative flex justify-center lg:justify-start lg:pl-[12%] animate-fade-in-up" style={{ animationDelay: "120ms" }}>
            <div className="relative w-full max-w-[470px]">
              {/* Tarjeta de atrás */}
              <div className="absolute -left-6 top-16 -bottom-9 right-5 rounded-[28px] bg-[#F4ECE2] shadow-[0_20px_40px_rgba(60,40,20,0.12)]" />
              {/* Trazos decorativos */}
              <Trazos className="absolute -top-3 -right-16 w-20 text-[#E58A3C] hidden sm:block" />
              <Trazos className="absolute bottom-10 -left-20 w-12 text-[#E58A3C] -scale-x-100 rotate-[-15deg] hidden sm:block" corto />

              <div className="relative rounded-[26px] bg-[#1D4A3E] ring-[3px] ring-white shadow-[0_24px_50px_rgba(15,40,32,0.35)] overflow-hidden px-8 pt-9 pb-9 text-center">
                <Hojas className="absolute -left-10 top-6 w-44 text-white/[0.06]" />
                <Hojas className="absolute -right-12 bottom-0 w-52 text-white/[0.05] rotate-180" />

                <p className="relative text-[13px] font-semibold tracking-[0.18em] text-white/75 uppercase">Mesa 1 · Demo</p>
                <div className="relative mx-auto mt-5 w-[240px] h-[230px] bg-white rounded-[18px] flex items-center justify-center shadow-[0_6px_20px_rgba(0,0,0,0.18)]">
                  <QRCodeSVG value={urlDemo} size={200} level="M" fgColor="#111" />
                </div>
                <p className="relative font-hero font-bold text-white text-[23px] mt-6">Escanéame con tu celular</p>
                <p className="relative text-[15px] text-white/70 mt-1.5">Así se vería el QR sobre la mesa.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <main className="max-w-[1464px] mx-auto px-5 sm:px-8">
        {/* ───────── Cómo funciona ───────── */}
        <section className="-mt-4 relative z-10">
          <Titulo barra="bg-terra">Cómo funciona</Titulo>
          <ol className="mt-5 flex flex-col lg:flex-row lg:items-stretch gap-4 lg:gap-0">
            {PASOS.map(({ titulo, texto, Icono, circulo, numero }, i) => (
              <li key={titulo} className="contents">
                <div className="flex-1 bg-white rounded-2xl border border-[#EEE8DF] shadow-[0_2px_10px_rgba(60,40,20,0.04)] px-6 py-4 flex items-start gap-7">
                  <span className={`w-[84px] h-[84px] shrink-0 self-center rounded-full flex items-center justify-center ${circulo}`}>
                    <Icono size={34} strokeWidth={1.7} />
                  </span>
                  <div>
                    <span className={`inline-flex w-8 h-8 rounded-lg items-center justify-center text-[15px] font-bold ${numero}`}>
                      {i + 1}
                    </span>
                    <p className="font-bold text-[18px] text-ink mt-1.5">{titulo}</p>
                    <p className="text-[14.5px] text-[#7C7870] leading-snug mt-1">{texto}</p>
                  </div>
                </div>
                {i < PASOS.length - 1 && (
                  <span className="hidden lg:flex w-14 shrink-0 items-center justify-center text-ink" aria-hidden="true">
                    <ArrowRight size={24} strokeWidth={1.8} />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* ───────── Para el personal ───────── */}
        <section className="mt-6">
          <Titulo barra="bg-forest">Para el personal</Titulo>
          <ul className="mt-5 grid gap-4 lg:grid-cols-3 lg:gap-7">
            {PERSONAL.map(({ ruta, titulo, texto, Icono, color }) => (
              <li key={ruta}>
                <Link
                  to={ruta}
                  className="group h-full bg-white rounded-2xl border border-[#EEE8DF] shadow-[0_2px_10px_rgba(60,40,20,0.04)] px-7 py-4 flex items-center gap-6 hover:border-forest/40 transition"
                >
                  <span className={`w-[58px] h-[58px] shrink-0 rounded-2xl flex items-center justify-center ${color}`}>
                    <Icono size={28} strokeWidth={1.7} />
                  </span>
                  <span className="flex-grow">
                    <span className="block font-bold text-[18px] text-ink">{titulo}</span>
                    <span className="block text-[14px] text-[#7C7870] leading-snug mt-0.5">{texto}</span>
                  </span>
                  <ArrowRight size={18} className="shrink-0 text-ink transition group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-4 border-t border-[#E6E0D6] py-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#8A867E]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
            <Leaf size={15} className="text-mint" strokeWidth={2} />
            Comanda
          </span>
          <span aria-hidden="true">•</span>
          <span>Proyecto de portafolio</span>
          <span aria-hidden="true">•</span>
          <span>React, Tailwind y Supabase</span>
        </footer>
      </main>
    </div>
  );
}

function Titulo({ children, barra }) {
  return (
    <h2 className="font-hero font-extrabold text-[26px] text-ink leading-tight">
      {children}
      <span className={`block w-7 h-[3px] rounded-full mt-1.5 ${barra}`} />
    </h2>
  );
}

// Mesa alta con dos patas (lucide no trae una)
function IconoMesa({ size = 24, strokeWidth = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h18" />
      <path d="M5 7 3.5 20M19 7l1.5 13" />
      <path d="M6 12h12" />
      <path d="M4 4h16v3H4z" />
    </svg>
  );
}

// Trazos naranjas tipo "brillo"
function Trazos({ className, corto = false }) {
  return (
    <svg className={className} viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path d="M14 46 L44 6" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
      {!corto && <path d="M22 70 L70 40" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />}
      {corto && <path d="M10 70 L40 58" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />}
    </svg>
  );
}

// Hojas tenues de fondo dentro de la tarjeta verde
function Hojas({ className }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="currentColor" aria-hidden="true">
      <path d="M100 10c40 30 55 80 30 130-35-10-60-45-55-85 3-20 12-35 25-45z" />
      <path d="M40 60c30 5 55 30 60 65-30 5-58-15-65-40-2-9 0-18 5-25z" />
      <path d="M150 90c22 15 30 42 18 68-22-6-36-26-34-48 1-8 7-15 16-20z" />
    </svg>
  );
}
