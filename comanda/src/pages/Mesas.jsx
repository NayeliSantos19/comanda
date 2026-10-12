import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabaseClient";
import { useOperacion } from "../hooks/useOperacion";
import { useAhora } from "../hooks/useAhora";
import { dinero, numeroPedido } from "../lib/dinero";
import { hace } from "../lib/fechas";
import Navegacion from "../components/Navegacion.jsx";
import Modal from "../components/Modal.jsx";
import EstadoPedido from "../components/EstadoPedido.jsx";

const urlMesa = (codigo) => `${window.location.origin}/mesa/${codigo}`;

// Junta los platos repetidos de varios pedidos: "3× Revuelta" en vez de tres líneas
function agruparItems(pedidos) {
  const mapa = new Map();
  pedidos.forEach((p) =>
    p.items.forEach((i) => {
      const clave = `${i.nombre}|${i.precio_unitario}`;
      const actual = mapa.get(clave) ?? { nombre: i.nombre, precio: Number(i.precio_unitario), cantidad: 0 };
      actual.cantidad += i.cantidad;
      mapa.set(clave, actual);
    })
  );
  return [...mapa.values()];
}

export default function Mesas() {
  const { pedidos, mesas, cargando, error, recargar } = useOperacion();
  const ahora = useAhora(30000);
  const [cuentaDe, setCuentaDe] = useState(null);
  const [qrDe, setQrDe] = useState(null);
  const [nuevaMesa, setNuevaMesa] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const abiertosDe = (mesaId) => pedidos.filter((p) => p.mesa_id === mesaId && !p.pagado && p.estado !== "cancelado");

  async function atenderLlamado(mesa) {
    await supabase.from("mesas").update({ llamado: null, llamado_en: null }).eq("id", mesa.id);
  }

  async function cerrarCuenta(mesa) {
    setGuardando(true);
    const ids = pedidos.filter((p) => p.mesa_id === mesa.id && !p.pagado).map((p) => p.id);
    const r1 = ids.length ? await supabase.from("pedidos").update({ pagado: true }).in("id", ids) : { error: null };
    const r2 = await supabase.from("mesas").update({ llamado: null, llamado_en: null }).eq("id", mesa.id);
    setGuardando(false);
    if (r1.error || r2.error) {
      setMensaje("No se pudo cerrar la cuenta. Intenta de nuevo.");
      return;
    }
    setCuentaDe(null);
    setMensaje(`Cuenta de ${mesa.nombre} cerrada. La mesa quedó libre.`);
    recargar();
  }

  async function agregarMesa(e) {
    e.preventDefault();
    const nombre = nuevaMesa.trim();
    if (!nombre) return;
    const { error } = await supabase.from("mesas").insert({ nombre, orden: mesas.length + 1 });
    if (error) setMensaje(error.message.includes("duplicate") ? "Ya existe una mesa con ese nombre." : error.message);
    else {
      setNuevaMesa("");
      recargar();
    }
  }

  async function nuevoCodigo(mesa) {
    const codigo = Math.random().toString(36).slice(2, 12);
    const { data } = await supabase.from("mesas").update({ codigo }).eq("id", mesa.id).select().single();
    if (data) setQrDe(data);
    if (data?.codigo !== codigo) setMensaje("La mesa de la demo conserva su código fijo.");
    recargar();
  }

  async function alternarActiva(mesa) {
    await supabase.from("mesas").update({ activa: !mesa.activa }).eq("id", mesa.id);
    recargar();
  }

  const mesaCuenta = cuentaDe && mesas.find((m) => m.id === cuentaDe);
  const pedidosCuenta = mesaCuenta ? abiertosDe(mesaCuenta.id) : [];
  const totalCuenta = pedidosCuenta.reduce((s, p) => s + Number(p.total), 0);
  const sinEntregar = pedidosCuenta.filter((p) => p.estado !== "entregado").length;

  const totalAbierto = mesas.reduce((s, m) => s + abiertosDe(m.id).reduce((a, p) => a + Number(p.total), 0), 0);
  const cobradoHoy = pedidos.filter((p) => p.pagado && p.estado !== "cancelado").reduce((s, p) => s + Number(p.total), 0);

  return (
    <>
      <div className="min-h-screen px-5 sm:px-8 py-6 max-w-6xl mx-auto no-imprimir">
        <Navegacion />

        <div className="flex flex-wrap items-end justify-between gap-4 mt-7">
          <div>
            <h1 className="font-display text-3xl font-bold">Mesas</h1>
            <p className="text-sm text-muted mt-1">Cuentas abiertas, llamados y códigos QR.</p>
          </div>
          <div className="flex gap-3">
            <Dato titulo="Por cobrar" valor={dinero(totalAbierto)} />
            <Dato titulo="Cobrado hoy" valor={dinero(cobradoHoy)} />
          </div>
        </div>

        {mensaje && (
          <div className="mt-5 bg-accentLight text-accent rounded-xl px-4 py-3 text-[13px] font-semibold flex justify-between gap-3">
            {mensaje}
            <button type="button" onClick={() => setMensaje(null)} aria-label="Cerrar aviso">✕</button>
          </div>
        )}
        {error && <p className="mt-4 text-sm text-red-600">No se pudieron cargar las mesas: {error}</p>}

        {cargando ? (
          <p className="text-sm text-muted mt-8">Cargando…</p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mesas.map((m) => {
              const abiertos = abiertosDe(m.id);
              const total = abiertos.reduce((s, p) => s + Number(p.total), 0);
              const pendientes = abiertos.filter((p) => p.estado !== "entregado").length;
              return (
                <li
                  key={m.id}
                  className={`bg-white border rounded-2xl p-4 flex flex-col ${
                    m.llamado ? "border-coral animate-destello" : "border-line"
                  } ${m.activa ? "" : "opacity-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-xl font-bold">{m.nombre}</p>
                      <p className="text-[12px] text-muted mt-0.5">
                        {!m.activa
                          ? "Desactivada"
                          : abiertos.length
                          ? `${abiertos.length} pedido${abiertos.length > 1 ? "s" : ""}${pendientes ? ` · ${pendientes} en cocina` : ""}`
                          : "Libre"}
                      </p>
                    </div>
                    <p className={`font-display text-xl font-bold tabular ${total ? "" : "text-line"}`}>{dinero(total)}</p>
                  </div>

                  {m.llamado && (
                    <div className="mt-3 bg-coralLight rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-coral">
                        {m.llamado === "cuenta" ? "Pide la cuenta" : "Llama al mesero"}
                        <span className="font-normal text-coral/80"> · {hace(m.llamado_en, ahora)}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => atenderLlamado(m)}
                        className="px-3 py-1.5 rounded-lg bg-coral text-white text-[12px] font-semibold"
                      >
                        Atendido
                      </button>
                    </div>
                  )}

                  <div className="h-4" />
                  <div className="mt-auto pt-3 border-t border-line flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCuentaDe(m.id)}
                      disabled={!abiertos.length}
                      className="flex-grow py-2 rounded-xl bg-accent text-paper text-[13px] font-semibold disabled:bg-line disabled:text-muted"
                    >
                      Ver cuenta
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrDe(m)}
                      className="px-4 py-2 rounded-xl border border-line text-[13px] font-semibold hover:border-accent"
                    >
                      QR
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <form onSubmit={agregarMesa} className="mt-6 flex gap-2 max-w-sm">
          <input
            value={nuevaMesa}
            onChange={(e) => setNuevaMesa(e.target.value)}
            placeholder="Nueva mesa (ej. Terraza 1)"
            maxLength={40}
            className="flex-grow px-3.5 py-2.5 rounded-xl border border-line bg-white text-sm"
          />
          <button type="submit" className="px-4 py-2.5 rounded-xl bg-ink text-paper text-sm font-semibold">
            Agregar
          </button>
        </form>
      </div>

      {/* Cuenta de la mesa */}
      <Modal abierto={!!mesaCuenta} onCerrar={() => setCuentaDe(null)} titulo={`Cuenta · ${mesaCuenta?.nombre ?? ""}`}>
        <ul className="flex flex-col gap-1.5 text-[14px]">
          {agruparItems(pedidosCuenta).map((i) => (
            <li key={`${i.nombre}${i.precio}`} className="flex justify-between gap-3">
              <span>
                <span className="font-semibold tabular">{i.cantidad}×</span> {i.nombre}
                <span className="text-muted text-[12px]"> · {dinero(i.precio)}</span>
              </span>
              <span className="tabular">{dinero(i.cantidad * i.precio)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
          <span className="text-muted">Total</span>
          <span className="font-display text-3xl font-bold tabular">{dinero(totalCuenta)}</span>
        </div>

        <details className="mt-4">
          <summary className="text-[13px] font-semibold text-accent cursor-pointer">Ver pedidos ({pedidosCuenta.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {pedidosCuenta.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-[13px] bg-white border border-line rounded-xl px-3 py-2">
                <span className="font-semibold tabular">{numeroPedido(p.numero)}</span>
                <EstadoPedido estado={p.estado} />
                <span className="tabular">{dinero(p.total)}</span>
              </li>
            ))}
          </ul>
        </details>

        {sinEntregar > 0 && (
          <p className="mt-4 text-[13px] bg-sunLight text-sun rounded-xl px-3 py-2.5 font-semibold">
            Ojo: {sinEntregar} pedido{sinEntregar > 1 ? "s" : ""} todavía no se ha{sinEntregar > 1 ? "n" : ""} entregado.
          </p>
        )}

        <button
          type="button"
          onClick={() => cerrarCuenta(mesaCuenta)}
          disabled={guardando}
          className="mt-5 w-full bg-accent text-paper rounded-2xl py-4 font-semibold disabled:opacity-60"
        >
          {guardando ? "Cerrando…" : `Cobrado ${dinero(totalCuenta)} · liberar mesa`}
        </button>
      </Modal>

      {/* Código QR */}
      <Modal abierto={!!qrDe} onCerrar={() => setQrDe(null)} titulo={`QR · ${qrDe?.nombre ?? ""}`}>
        {qrDe && (
          <div className="flex flex-col items-center text-center">
            <div className="bg-white rounded-3xl p-6 border border-line w-full flex flex-col items-center">
              <p className="font-display text-2xl font-bold">{qrDe.nombre}</p>
              <p className="text-[13px] text-muted mt-1">Escanea para ver el menú y pedir</p>
              <QRCodeSVG value={urlMesa(qrDe.codigo)} size={220} level="M" className="mt-5" />
              <p className="text-[11px] text-muted mt-4 break-all">{urlMesa(qrDe.codigo)}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 w-full no-imprimir">
              <button type="button" onClick={() => window.print()} className="py-3 rounded-xl bg-accent text-paper text-[13px] font-semibold">
                Imprimir
              </button>
              <a
                href={urlMesa(qrDe.codigo)}
                target="_blank"
                rel="noreferrer"
                className="py-3 rounded-xl border border-line bg-white text-[13px] font-semibold"
              >
                Abrir como cliente
              </a>
            </div>
            <div className="mt-5 text-left w-full no-imprimir">
              <p className="text-[12px] text-muted leading-relaxed">
                Si alguien se llevó una foto del QR, genera un código nuevo: el anterior deja de funcionar.
              </p>
              <div className="mt-2 flex gap-4">
                <button type="button" onClick={() => nuevoCodigo(qrDe)} className="text-[13px] font-semibold text-coral">
                  Generar código nuevo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    alternarActiva(qrDe);
                    setQrDe(null);
                  }}
                  className="text-[13px] font-semibold text-muted"
                >
                  {qrDe.activa ? "Desactivar mesa" : "Activar mesa"}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Dato({ titulo, valor }) {
  return (
    <div className="bg-white border border-line rounded-2xl px-4 py-2.5">
      <p className="text-[11px] text-muted font-semibold uppercase tracking-wide">{titulo}</p>
      <p className="font-display text-xl font-bold tabular">{valor}</p>
    </div>
  );
}
