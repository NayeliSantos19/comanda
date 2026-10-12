import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BellRing, Minus, Plus, Receipt, Search, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useMenu } from "../hooks/useMenu";
import { dinero, numeroPedido } from "../lib/dinero";
import { ESTADOS, PASOS } from "../lib/estados";
import { hora } from "../lib/fechas";
import { desbloquearAudio, timbreListo } from "../lib/sonido";
import Marca from "../components/Marca.jsx";
import Modal from "../components/Modal.jsx";
import EstadoPedido from "../components/EstadoPedido.jsx";
import FotoPlato from "../components/FotoPlato.jsx";

// Color del círculo cuando un plato no tiene foto, según su categoría
const COLORES = ["bg-peach text-terra", "bg-mintLight text-mint", "bg-roseLight text-rose", "bg-sunLight text-sun"];

// El carrito se guarda en el navegador por mesa, así no se pierde si recargan la página
const claveCarrito = (codigo) => `comanda-carrito-${codigo}`;
function leerCarrito(codigo) {
  try {
    return JSON.parse(localStorage.getItem(claveCarrito(codigo))) ?? {};
  } catch {
    return {};
  }
}
function guardarCarrito(codigo, carrito) {
  try {
    localStorage.setItem(claveCarrito(codigo), JSON.stringify(carrito));
  } catch {
    /* modo privado: el carrito vive solo en memoria */
  }
}

function mensajeError(error) {
  const m = error?.message ?? "";
  if (m.includes("ya no está disponible")) return "Uno de los platos se acaba de agotar. Revisa tu pedido.";
  if (m.includes("demasiados pedidos")) return "Tienes varios pedidos esperando. Espera a que la cocina los tome.";
  if (m.includes("Mesa no encontrada")) return "Esta mesa ya no está activa. Pide ayuda al personal.";
  return "No se pudo enviar el pedido. Revisa tu conexión e intenta de nuevo.";
}

// Quita tildes para que buscar "platano" encuentre "Plátano"
const normalizar = (t) => (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Mesa() {
  const { codigo } = useParams();
  const { categorias, cargando: cargandoMenu, error: errorMenu, recargar: recargarMenu } = useMenu();

  const [mesa, setMesa] = useState(undefined); // undefined = cargando, null = no existe
  const [sinConexion, setSinConexion] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [vista, setVista] = useState("menu");
  const [carrito, setCarrito] = useState(() => leerCarrito(codigo));
  const [verCarrito, setVerCarrito] = useState(false);
  const [detalle, setDetalle] = useState(null); // plato abierto en la ficha
  const [notaGeneral, setNotaGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [filtro, setFiltro] = useState("todo");
  const [busqueda, setBusqueda] = useState("");
  const estadosPrevios = useRef({});

  useEffect(() => guardarCarrito(codigo, carrito), [codigo, carrito]);

  function mostrarAviso(texto, tipo = "ok") {
    setAviso({ texto, tipo, id: Date.now() });
  }
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  // ── Datos de la mesa: el cliente no tiene sesión, así que consultamos cada 4 s ──
  const cargarMesa = useCallback(async () => {
    const [m, p] = await Promise.all([
      supabase.rpc("mesa_por_codigo", { p_codigo: codigo }),
      supabase.rpc("pedidos_de_mesa", { p_codigo: codigo }),
    ]);
    if (m.error) {
      setSinConexion(true);
      return;
    }
    setSinConexion(false);
    setMesa(m.data ?? null);
    if (!p.error) setPedidos(p.data ?? []);
  }, [codigo]);

  useEffect(() => {
    cargarMesa();
    const t = setInterval(cargarMesa, 4000);
    const alVolver = () => document.visibilityState === "visible" && cargarMesa();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargarMesa]);

  // Aviso cuando un pedido pasa a "listo"
  useEffect(() => {
    const previos = estadosPrevios.current;
    pedidos.forEach((p) => {
      if (previos[p.id] && previos[p.id] !== "listo" && p.estado === "listo") {
        timbreListo();
        navigator.vibrate?.([200, 100, 200]);
        mostrarAviso(`¡Tu pedido ${numeroPedido(p.numero)} está listo!`);
      }
      previos[p.id] = p.estado;
    });
  }, [pedidos]);

  // ── Menú ──
  const platosPorId = useMemo(() => {
    const mapa = {};
    categorias.forEach((c, i) =>
      c.platos.forEach((p) => (mapa[p.id] = { ...p, categoria: c.nombre, color: COLORES[i % COLORES.length] }))
    );
    return mapa;
  }, [categorias]);

  const secciones = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return categorias
      .filter((c) => filtro === "todo" || c.id === filtro)
      .map((c) => ({
        ...c,
        platos: c.platos
          .map((p) => platosPorId[p.id])
          .filter((p) => !q || normalizar(p.nombre).includes(q) || normalizar(p.descripcion).includes(q)),
      }))
      .filter((c) => c.platos.length);
  }, [categorias, filtro, busqueda, platosPorId]);

  // ── Carrito ──
  const lineas = Object.entries(carrito)
    .map(([id, l]) => ({ ...l, plato: platosPorId[id] }))
    .filter((l) => l.plato);
  const cantidadCarrito = lineas.reduce((s, l) => s + l.cantidad, 0);
  const totalCarrito = lineas.reduce((s, l) => s + l.cantidad * Number(l.plato.precio), 0);

  function ponerEnCarrito(platoId, cantidad, nota) {
    setCarrito((c) => {
      const copia = { ...c };
      const n = Math.min(20, Math.max(0, cantidad));
      if (n === 0) delete copia[platoId];
      else copia[platoId] = { cantidad: n, nota: nota ?? c[platoId]?.nota ?? "" };
      return copia;
    });
  }
  const cambiarCantidad = (platoId, delta) => ponerEnCarrito(platoId, (carrito[platoId]?.cantidad ?? 0) + delta);

  function agregarRapido(plato) {
    cambiarCantidad(plato.id, 1);
    navigator.vibrate?.(15);
  }

  async function enviarPedido() {
    desbloquearAudio(); // aprovechamos el toque para poder sonar cuando esté listo
    setError(null);
    setEnviando(true);
    const items = lineas.map((l) => ({ plato_id: l.plato.id, cantidad: l.cantidad, nota: l.nota || null }));
    const { data, error } = await supabase.rpc("crear_pedido", {
      p_codigo: codigo,
      p_items: items,
      p_nota: notaGeneral || null,
    });
    setEnviando(false);
    if (error) {
      setError(mensajeError(error));
      recargarMenu();
      return;
    }
    setCarrito({});
    setNotaGeneral("");
    setVerCarrito(false);
    setVista("mesa");
    mostrarAviso(`Pedido ${numeroPedido(data.numero)} enviado a cocina`);
    cargarMesa();
  }

  async function cancelar(pedido) {
    const { data } = await supabase.rpc("cancelar_pedido", { p_codigo: codigo, p_pedido_id: pedido.id });
    if (data) mostrarAviso(`Pedido ${numeroPedido(pedido.numero)} cancelado`, "info");
    else mostrarAviso("La cocina ya lo empezó, ya no se puede cancelar.", "info");
    cargarMesa();
  }

  async function llamar(motivo) {
    const { error } = await supabase.rpc("llamar_personal", { p_codigo: codigo, p_motivo: motivo });
    if (error) return mostrarAviso("No se pudo avisar. Intenta de nuevo.", "info");
    mostrarAviso(motivo === "cuenta" ? "Listo, ya te llevan la cuenta" : "Listo, un mesero viene en camino");
    cargarMesa();
  }

  // ── Cuenta de la mesa ──
  const pedidosValidos = pedidos.filter((p) => p.estado !== "cancelado");
  const totalMesa = pedidosValidos.reduce((s, p) => s + Number(p.total), 0);
  const enCurso = pedidosValidos.filter((p) => p.estado !== "entregado").length;

  // ── Pantallas de carga / error ──
  if (mesa === undefined) {
    return sinConexion ? (
      <PantallaMensaje
        titulo="Sin conexión"
        texto="No pudimos cargar tu mesa. Revisa tu internet e intenta de nuevo."
        accion={<button type="button" onClick={cargarMesa} className="mt-6 px-5 py-3 rounded-full bg-ink text-white text-sm font-semibold">Reintentar</button>}
      />
    ) : (
      <EsqueletoMesa />
    );
  }
  if (mesa === null) {
    return (
      <PantallaMensaje
        titulo="No encontramos esta mesa"
        texto="Vuelve a escanear el código QR de tu mesa o pide ayuda al personal."
        accion={<Link to="/" className="mt-6 text-sm font-semibold text-forest underline underline-offset-2">Ir al inicio</Link>}
      />
    );
  }

  const enDetalle = detalle && platosPorId[detalle];

  return (
    <div className="min-h-screen bg-[#FBF7F1]">
      <div className="max-w-md mx-auto min-h-screen pb-36">
        {/* Encabezado */}
        <header className="px-5 pt-5 flex items-center justify-between">
          <Marca enlace={false} />
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-line text-[12px] font-semibold">
            <span className={`w-2 h-2 rounded-full ${sinConexion ? "bg-sun" : "bg-mint animate-pulse"}`} />
            {mesa.nombre}
          </span>
        </header>

        {sinConexion && (
          <p role="status" className="mx-5 mt-3 bg-sunLight text-sun text-[13px] font-semibold rounded-xl px-3 py-2">
            Reconectando… tu pedido está a salvo.
          </p>
        )}

        {vista === "menu" ? (
          <main>
            <div className="px-5 pt-6">
              <p className="text-[14px] text-muted">¡Hola! Estás en la {mesa.nombre.toLowerCase()} 👋</p>
              <h1 className="font-hero font-extrabold text-[28px] leading-tight text-ink mt-0.5">¿Qué se te antoja hoy?</h1>

              <label className="mt-4 flex items-center gap-2.5 bg-white border border-line rounded-full px-4 py-3 focus-within:border-forest">
                <Search size={18} className="text-muted shrink-0" aria-hidden="true" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar pupusas, bebidas…"
                  aria-label="Buscar en el menú"
                  className="flex-grow bg-transparent text-[15px] outline-none placeholder:text-muted/80"
                />
                {busqueda && (
                  <button type="button" onClick={() => setBusqueda("")} aria-label="Borrar búsqueda" className="text-muted">
                    <X size={16} />
                  </button>
                )}
              </label>
            </div>

            {/* Categorías */}
            <nav className="sticky top-0 z-20 bg-[#FBF7F1]/95 backdrop-blur mt-4 px-5 py-2 flex gap-5 overflow-x-auto sin-scroll border-b border-line" aria-label="Categorías">
              {[{ id: "todo", nombre: "Todo" }, ...categorias].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFiltro(c.id)}
                  aria-pressed={filtro === c.id}
                  className={`shrink-0 pb-2 pt-1 text-[14px] font-semibold border-b-2 transition ${
                    filtro === c.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
            </nav>

            <div className="px-5">
              {cargandoMenu && <EsqueletoTarjetas />}
              {errorMenu && !cargandoMenu && (
                <div className="mt-8 text-center">
                  <p className="text-sm text-muted">No pudimos cargar el menú.</p>
                  <button type="button" onClick={recargarMenu} className="mt-3 px-4 py-2 rounded-full bg-ink text-white text-[13px] font-semibold">
                    Reintentar
                  </button>
                </div>
              )}
              {!cargandoMenu && !errorMenu && secciones.length === 0 && (
                <p className="text-center text-sm text-muted mt-10">No encontramos “{busqueda}”. Prueba con otra palabra.</p>
              )}

              {secciones.map((c) => (
                <section key={c.id} className="pt-6">
                  {filtro === "todo" && <h2 className="font-hero font-extrabold text-[19px] text-ink mb-3">{c.nombre}</h2>}
                  <ul className="grid grid-cols-2 gap-3">
                    {c.platos.map((p) => (
                      <TarjetaPlato
                        key={p.id}
                        plato={p}
                        cantidad={carrito[p.id]?.cantidad ?? 0}
                        onAbrir={() => setDetalle(p.id)}
                        onAgregar={() => agregarRapido(p)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </main>
        ) : (
          <MiMesa
            pedidos={pedidos}
            total={totalMesa}
            llamado={mesa.llamado}
            onCancelar={cancelar}
            onLlamar={llamar}
            onIrAlMenu={() => setVista("menu")}
          />
        )}
      </div>

      {/* Botón flotante del carrito */}
      {cantidadCarrito > 0 && !verCarrito && !enDetalle && (
        <div className="fixed bottom-[84px] inset-x-0 z-30 px-5 pointer-events-none">
          <button
            type="button"
            onClick={() => setVerCarrito(true)}
            className="pointer-events-auto max-w-md mx-auto w-full bg-ink text-white rounded-full pl-2 pr-6 py-2 flex items-center gap-3 font-semibold shadow-[0_12px_30px_rgba(30,29,36,0.35)] animate-fade-in-up"
          >
            <span className="w-11 h-11 rounded-full bg-peach text-terra flex items-center justify-center relative">
              <ShoppingBag size={20} />
            </span>
            <span className="text-left flex-grow">
              <span className="block text-[15px]">Ver pedido</span>
              <span className="block text-[12px] text-white/60 font-medium">
                {cantidadCarrito} producto{cantidadCarrito > 1 ? "s" : ""}
              </span>
            </span>
            <span className="tabular text-[16px]">{dinero(totalCarrito)}</span>
          </button>
        </div>
      )}

      {/* Barra inferior */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-line" aria-label="Secciones de la mesa">
        <div className="max-w-md mx-auto grid grid-cols-3 items-center px-6 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
          <BotonBarra activo={vista === "menu"} onClick={() => setVista("menu")} Icono={UtensilsCrossed} texto="Menú" />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => (cantidadCarrito ? setVerCarrito(true) : setVista("menu"))}
              aria-label={`Tu pedido: ${cantidadCarrito} productos`}
              className="relative -mt-7 w-14 h-14 rounded-full bg-peach text-terra border-4 border-white shadow-[0_6px_16px_rgba(196,84,44,0.25)] flex items-center justify-center"
            >
              <ShoppingBag size={22} />
              {cantidadCarrito > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-terra text-white text-[11px] font-bold flex items-center justify-center animate-pop-in" key={cantidadCarrito}>
                  {cantidadCarrito}
                </span>
              )}
            </button>
          </div>
          <BotonBarra
            activo={vista === "mesa"}
            onClick={() => setVista("mesa")}
            Icono={Receipt}
            texto={pedidosValidos.length ? `Mi mesa · ${dinero(totalMesa)}` : "Mi mesa"}
            insignia={enCurso}
          />
        </div>
      </nav>

      {/* Ficha del plato */}
      {enDetalle && (
        <FichaPlato
          key={enDetalle.id}
          plato={enDetalle}
          enCarrito={carrito[enDetalle.id]}
          onCerrar={() => setDetalle(null)}
          onGuardar={(cantidad, nota) => {
            ponerEnCarrito(enDetalle.id, cantidad, nota);
            setDetalle(null);
            if (cantidad > 0) mostrarAviso(`${enDetalle.nombre} en tu pedido`);
          }}
        />
      )}

      {/* Carrito */}
      <Modal abierto={verCarrito} onCerrar={() => setVerCarrito(false)} titulo="Tu pedido">
        {lineas.length === 0 ? (
          <p className="text-sm text-muted">Tu pedido está vacío.</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-line">
              {lineas.map((l) => (
                <li key={l.plato.id} className="py-3.5">
                  <div className="flex items-center gap-3">
                    <FotoPlato plato={l.plato} tam={52} ancho={120} color={l.plato.color} />
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-[15px] leading-tight">{l.plato.nombre}</p>
                      <p className="text-[13px] text-muted tabular mt-0.5">{dinero(l.plato.precio * l.cantidad)}</p>
                    </div>
                    <Contador
                      cantidad={l.cantidad}
                      onMas={() => cambiarCantidad(l.plato.id, 1)}
                      onMenos={() => cambiarCantidad(l.plato.id, -1)}
                      nombre={l.plato.nombre}
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={120}
                    value={l.nota ?? ""}
                    onChange={(e) => ponerEnCarrito(l.plato.id, l.cantidad, e.target.value)}
                    placeholder="Nota (ej. sin curtido, bien dorada)"
                    aria-label={`Nota para ${l.plato.nombre}`}
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-line bg-white text-[13px]"
                  />
                </li>
              ))}
            </ul>

            <label className="block text-[13px] font-semibold mt-4 mb-1.5" htmlFor="nota-general">
              Algo más para la cocina
            </label>
            <textarea
              id="nota-general"
              rows={2}
              maxLength={200}
              value={notaGeneral}
              onChange={(e) => setNotaGeneral(e.target.value)}
              placeholder="Ej. traer todo junto, alergia al maní…"
              className="w-full px-3 py-2.5 rounded-xl border border-line bg-white text-sm resize-none"
            />

            <div className="flex items-center justify-between mt-5 text-[15px]">
              <span className="text-muted">Total</span>
              <span className="font-hero font-extrabold text-2xl tabular">{dinero(totalCarrito)}</span>
            </div>

            {error && (
              <p role="alert" className="text-[13px] text-red-700 bg-red-50 rounded-xl px-3 py-2 mt-3">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={enviarPedido}
              disabled={enviando}
              className="mt-4 w-full bg-ink text-white rounded-full py-4 font-semibold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {enviando && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
              {enviando ? "Enviando…" : `Enviar a cocina · ${dinero(totalCarrito)}`}
            </button>
            <p className="text-[12px] text-muted text-center mt-2.5">Pagas al final, cuando pidas la cuenta.</p>
          </>
        )}
      </Modal>

      {/* Aviso flotante */}
      {aviso && (
        <div
          key={aviso.id}
          role="status"
          className={`fixed top-4 inset-x-4 z-[60] max-w-sm mx-auto rounded-2xl px-4 py-3 text-[14px] font-semibold shadow-lg animate-fade-in-up ${
            aviso.tipo === "ok" ? "bg-ink text-white" : "bg-white text-ink border border-line"
          }`}
        >
          {aviso.texto}
        </div>
      )}
    </div>
  );
}

// ───────── Piezas ─────────

function TarjetaPlato({ plato, cantidad, onAbrir, onAgregar }) {
  const agotado = !plato.disponible;
  return (
    <li className="relative">
      <button
        type="button"
        onClick={onAbrir}
        className={`w-full h-full bg-white rounded-[24px] border pt-4 pb-3.5 px-3 flex flex-col items-center text-center transition active:scale-[0.98] ${
          cantidad ? "border-forest/40 shadow-[0_6px_18px_rgba(23,61,50,0.10)]" : "border-[#EFE9E0] shadow-[0_2px_10px_rgba(60,40,20,0.05)]"
        }`}
        aria-label={`${plato.nombre}, ${dinero(plato.precio)}${agotado ? ", agotado" : ""}. Ver detalle`}
      >
        <FotoPlato
          plato={plato}
          tam={112}
          ancho={300}
          color={plato.color}
          className={`shadow-[0_8px_18px_rgba(60,40,20,0.18)] ${agotado ? "grayscale opacity-60" : ""}`}
        />
        <span className="mt-3 text-[11px] text-muted font-medium">{plato.categoria}</span>
        <span className="text-[14px] font-bold text-ink leading-tight mt-0.5 line-clamp-2">{plato.nombre}</span>
        <span className={`mt-1 text-[15px] font-extrabold tabular ${agotado ? "text-rose text-[13px]" : "text-ink"}`}>
          {agotado ? "Agotado" : dinero(plato.precio)}
        </span>
      </button>

      {!agotado && (
        <button
          type="button"
          onClick={onAgregar}
          aria-label={`Agregar ${plato.nombre}`}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md transition active:scale-90 ${
            cantidad ? "bg-forest" : "bg-ink"
          }`}
        >
          {cantidad ? <span key={cantidad} className="text-[13px] font-bold animate-pop-in">{cantidad}</span> : <Plus size={16} strokeWidth={2.6} />}
        </button>
      )}
    </li>
  );
}

function FichaPlato({ plato, enCarrito, onCerrar, onGuardar }) {
  const [cantidad, setCantidad] = useState(enCarrito?.cantidad || 1);
  const [nota, setNota] = useState(enCarrito?.nota ?? "");
  const agotado = !plato.disponible;
  const yaEsta = !!enCarrito;

  return (
    <Modal abierto onCerrar={onCerrar} titulo={plato.categoria}>
      <div className="flex flex-col items-center text-center">
        <h2 className="font-hero font-extrabold text-[24px] leading-tight">{plato.nombre}</h2>
        <p className="font-hero font-extrabold text-[20px] text-terra mt-1 tabular">{dinero(plato.precio)}</p>

        <div className="relative mt-6 mb-2 w-[230px] h-[230px] flex items-center justify-center">
          <span className="absolute w-[196px] h-[196px] rounded-[40px] bg-peach rotate-12" aria-hidden="true" />
          <FotoPlato
            plato={plato}
            tam={186}
            ancho={600}
            color={plato.color}
            className={`relative shadow-[0_18px_40px_rgba(60,40,20,0.28)] animate-pop-in ${agotado ? "grayscale" : ""}`}
          />
        </div>

        {plato.descripcion && <p className="text-[14px] text-muted leading-relaxed mt-3 max-w-xs">{plato.descripcion}</p>}

        {agotado ? (
          <p className="mt-6 w-full bg-roseLight text-rose rounded-2xl py-3 font-semibold text-[14px]">Este plato se agotó por hoy</p>
        ) : (
          <>
            <div className="mt-5 flex items-center gap-5" role="group" aria-label="Cantidad">
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.max(yaEsta ? 0 : 1, c - 1))}
                aria-label="Quitar uno"
                className="w-11 h-11 rounded-full border border-line bg-white flex items-center justify-center"
              >
                <Minus size={18} />
              </button>
              <span className="w-8 text-center font-hero font-extrabold text-[22px] tabular" aria-live="polite">
                {cantidad}
              </span>
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.min(20, c + 1))}
                aria-label="Agregar uno"
                className="w-11 h-11 rounded-full bg-ink text-white flex items-center justify-center"
              >
                <Plus size={18} />
              </button>
            </div>

            <input
              type="text"
              maxLength={120}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nota para la cocina (opcional)"
              aria-label="Nota para la cocina"
              className="mt-5 w-full px-4 py-3 rounded-2xl border border-line bg-white text-[14px] text-left"
            />

            <button
              type="button"
              onClick={() => onGuardar(cantidad, nota)}
              className={`mt-5 w-full rounded-full pl-2 pr-6 py-2 flex items-center gap-3 font-semibold text-white ${
                cantidad === 0 ? "bg-rose" : "bg-ink"
              }`}
            >
              <span className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
                {cantidad === 0 ? <X size={20} /> : <ShoppingBag size={20} />}
              </span>
              <span className="flex-grow text-left text-[15px]">
                {cantidad === 0 ? "Quitar del pedido" : yaEsta ? "Actualizar pedido" : "Agregar al pedido"}
              </span>
              {cantidad > 0 && <span className="tabular">{dinero(plato.precio * cantidad)}</span>}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

function Contador({ cantidad, onMas, onMenos, nombre }) {
  return (
    <div className="shrink-0 flex items-center gap-1 bg-[#F4EFE7] rounded-full p-1">
      <button
        type="button"
        onClick={onMenos}
        aria-label={`Quitar un ${nombre}`}
        className="w-8 h-8 rounded-full bg-white text-ink flex items-center justify-center"
      >
        <Minus size={15} />
      </button>
      <span className="w-6 text-center font-bold tabular">{cantidad}</span>
      <button
        type="button"
        onClick={onMas}
        aria-label={`Agregar otro ${nombre}`}
        className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

function BotonBarra({ activo, onClick, Icono, texto, insignia = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo ? "page" : undefined}
      className={`relative flex flex-col items-center gap-0.5 text-[11px] font-semibold transition ${activo ? "text-ink" : "text-muted"}`}
    >
      <span className="relative">
        <Icono size={21} strokeWidth={activo ? 2.3 : 1.8} />
        {insignia > 0 && (
          <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-terra text-white text-[10px] font-bold flex items-center justify-center">
            {insignia}
          </span>
        )}
      </span>
      <span className="whitespace-nowrap">{texto}</span>
      {activo && <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-ink" />}
    </button>
  );
}

function MiMesa({ pedidos, total, llamado, onCancelar, onLlamar, onIrAlMenu }) {
  if (pedidos.length === 0) {
    return (
      <main className="px-5 pt-14 text-center">
        <span className="mx-auto w-20 h-20 rounded-full bg-peach text-terra flex items-center justify-center">
          <Receipt size={32} />
        </span>
        <p className="font-hero font-extrabold text-xl mt-4">Aún no has pedido nada</p>
        <p className="text-sm text-muted mt-1.5">Elige del menú y envía tu pedido a cocina.</p>
        <button type="button" onClick={onIrAlMenu} className="mt-5 px-6 py-3 rounded-full bg-ink text-white font-semibold text-sm">
          Ver el menú
        </button>
        <BotonesPersonal llamado={llamado} onLlamar={onLlamar} />
      </main>
    );
  }

  return (
    <main className="px-5 pt-6 flex flex-col gap-3">
      <h1 className="font-hero font-extrabold text-[26px] leading-tight">Tu mesa</h1>
      {[...pedidos].reverse().map((p) => (
        <article
          key={p.id}
          className={`bg-white border border-[#EFE9E0] rounded-3xl p-4 animate-fade-in-up ${p.estado === "listo" ? "animate-destello" : ""}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-hero font-extrabold text-lg leading-none">Pedido {numeroPedido(p.numero)}</p>
              <p className="text-[12px] text-muted mt-1">{hora(p.creado_en)}</p>
            </div>
            <EstadoPedido estado={p.estado} />
          </div>

          {p.estado !== "cancelado" && <Progreso estado={p.estado} />}
          <p className="text-[13px] font-semibold mt-2">{ESTADOS[p.estado]?.cliente}</p>

          <ul className="mt-3 text-[13px] flex flex-col gap-1">
            {p.items.map((i, k) => (
              <li key={k} className="flex justify-between gap-3">
                <span>
                  <span className="font-semibold tabular">{i.cantidad}×</span> {i.nombre}
                  {i.nota && <span className="block text-[12px] text-muted">“{i.nota}”</span>}
                </span>
                <span className="tabular text-muted">{dinero(i.cantidad * i.precio_unitario)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
            {p.estado === "recibido" ? (
              <button type="button" onClick={() => onCancelar(p)} className="text-[13px] font-semibold text-rose">
                Cancelar pedido
              </button>
            ) : (
              <span />
            )}
            <span className={`font-semibold tabular ${p.estado === "cancelado" ? "line-through text-muted" : ""}`}>
              {dinero(p.total)}
            </span>
          </div>
        </article>
      ))}

      <div className="bg-forest text-white rounded-3xl p-5 mt-1">
        <div className="flex items-center justify-between">
          <span className="text-white/75 text-sm">Total de la mesa</span>
          <span className="font-hero font-extrabold text-2xl tabular">{dinero(total)}</span>
        </div>
        <p className="text-[12px] text-white/65 mt-1">Se paga al final con el personal.</p>
      </div>

      <BotonesPersonal llamado={llamado} onLlamar={onLlamar} />
    </main>
  );
}

function Progreso({ estado }) {
  const paso = ESTADOS[estado]?.paso ?? 0;
  return (
    <div className="mt-3.5 grid grid-cols-4 gap-1.5" aria-label={`Paso ${paso + 1} de ${PASOS.length}`}>
      {PASOS.map((p, i) => (
        <div key={p} className={`h-1.5 rounded-full transition-colors ${i <= paso ? "bg-forest" : "bg-line"}`} />
      ))}
    </div>
  );
}

function BotonesPersonal({ llamado, onLlamar }) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-2.5">
      {[
        ["mesero", "Llamar al mesero", BellRing],
        ["cuenta", "Pedir la cuenta", Receipt],
      ].map(([motivo, texto, Icono]) => (
        <button
          key={motivo}
          type="button"
          disabled={llamado === motivo}
          onClick={() => onLlamar(motivo)}
          className="py-3.5 rounded-2xl border border-line bg-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:border-forest disabled:bg-mintLight disabled:text-mint disabled:border-mintLight"
        >
          <Icono size={16} />
          {llamado === motivo ? "Avisado ✓" : texto}
        </button>
      ))}
    </div>
  );
}

function PantallaMensaje({ titulo, texto, accion }) {
  return (
    <div className="min-h-screen px-6 flex flex-col items-center justify-center text-center max-w-sm mx-auto bg-[#FBF7F1]">
      <Marca />
      <h1 className="font-hero font-extrabold text-2xl mt-8">{titulo}</h1>
      <p className="text-sm text-muted mt-2">{texto}</p>
      {accion}
    </div>
  );
}

// Bloques grises mientras carga: el cliente ve la forma de la pantalla de inmediato
function EsqueletoTarjetas() {
  return (
    <ul className="grid grid-cols-2 gap-3 pt-6" aria-label="Cargando el menú">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="bg-white rounded-[24px] border border-[#EFE9E0] pt-4 pb-4 px-3 flex flex-col items-center animate-pulse">
          <span className="w-28 h-28 rounded-full bg-line" />
          <span className="mt-4 h-2.5 w-12 rounded bg-line" />
          <span className="mt-2 h-3 w-20 rounded bg-line" />
          <span className="mt-2 h-3 w-10 rounded bg-line" />
        </li>
      ))}
    </ul>
  );
}

function EsqueletoMesa() {
  return (
    <div className="min-h-screen bg-[#FBF7F1]">
      <div className="max-w-md mx-auto px-5 pt-5 animate-pulse" aria-label="Cargando la mesa">
        <div className="flex justify-between">
          <span className="h-8 w-28 rounded-lg bg-line" />
          <span className="h-8 w-20 rounded-full bg-line" />
        </div>
        <span className="block mt-8 h-3 w-40 rounded bg-line" />
        <span className="block mt-3 h-7 w-60 rounded bg-line" />
        <span className="block mt-5 h-12 w-full rounded-full bg-line" />
      </div>
      <div className="max-w-md mx-auto px-5">
        <EsqueletoTarjetas />
      </div>
    </div>
  );
}
