import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useOperacion } from "../hooks/useOperacion";
import { useAhora } from "../hooks/useAhora";
import { SIGUIENTE } from "../lib/estados";
import { numeroPedido } from "../lib/dinero";
import { minutosDesde, hace } from "../lib/fechas";
import { audioListo, desbloquearAudio, timbreLlamado, timbrePedido } from "../lib/sonido";
import Navegacion from "../components/Navegacion.jsx";

const COLUMNAS = [
  { estado: "recibido", titulo: "Nuevos", punto: "bg-sun" },
  { estado: "preparando", titulo: "En preparación", punto: "bg-accentLight" },
  { estado: "listo", titulo: "Listos para llevar", punto: "bg-coral" },
];

// Color del reloj según cuánto lleva esperando el pedido
function colorEspera(min) {
  if (min >= 25) return "bg-coral text-white";
  if (min >= 15) return "bg-sun text-night";
  return "bg-white/10 text-paper/80";
}

export default function Cocina() {
  const { pedidos, mesas, cargando, error } = useOperacion();
  const ahora = useAhora(20000);
  const [sonido, setSonido] = useState(audioListo());
  const [porCancelar, setPorCancelar] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const conocidos = useRef(null);
  const llamadosPrevios = useRef(null);

  // Suena cuando llega un pedido nuevo (no al abrir la página)
  useEffect(() => {
    if (cargando) return;
    const ids = new Set(pedidos.map((p) => p.id));
    if (conocidos.current) {
      const nuevo = pedidos.some((p) => !conocidos.current.has(p.id) && p.estado === "recibido");
      if (nuevo) timbrePedido();
    }
    conocidos.current = ids;
  }, [pedidos, cargando]);

  useEffect(() => {
    if (cargando) return;
    const actuales = new Set(mesas.filter((m) => m.llamado).map((m) => m.id));
    if (llamadosPrevios.current && [...actuales].some((id) => !llamadosPrevios.current.has(id))) timbreLlamado();
    llamadosPrevios.current = actuales;
  }, [mesas, cargando]);

  async function avanzar(pedido) {
    const sig = SIGUIENTE[pedido.estado];
    if (!sig) return;
    setOcupado(pedido.id);
    await supabase
      .from("pedidos")
      .update({ estado: sig.estado, [sig.campo]: new Date().toISOString() })
      .eq("id", pedido.id)
      .eq("estado", pedido.estado); // si otra pantalla ya lo movió, no hace nada
    setOcupado(null);
  }

  async function cancelar(pedido) {
    setOcupado(pedido.id);
    await supabase.from("pedidos").update({ estado: "cancelado" }).eq("id", pedido.id);
    setPorCancelar(null);
    setOcupado(null);
  }

  const llamados = mesas.filter((m) => m.llamado);
  const entregadosHoy = pedidos.filter((p) => p.estado === "entregado").length;

  return (
    <div className="min-h-screen bg-night text-paper">
      <div className="px-5 sm:px-8 py-6 max-w-7xl mx-auto">
        <Navegacion
          oscuro
          extra={
            !sonido && (
              <button
                type="button"
                onClick={() => {
                  desbloquearAudio();
                  timbrePedido();
                  setSonido(true);
                }}
                className="px-3 py-2 rounded-xl bg-coral text-white text-[13px] font-semibold"
              >
                Activar sonido
              </button>
            )
          }
        />

        <div className="flex flex-wrap items-end justify-between gap-3 mt-7">
          <div>
            <h1 className="font-display text-3xl font-bold">Cocina</h1>
            <p className="text-sm text-paper/60 mt-1">
              {entregadosHoy} entregados hoy · los pedidos aparecen solos, no hace falta recargar
            </p>
          </div>
          {llamados.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {llamados.map((m) => (
                <span key={m.id} className="px-3 py-1.5 rounded-full bg-coral text-white text-[12px] font-semibold animate-destello">
                  {m.nombre} {m.llamado === "cuenta" ? "pide la cuenta" : "llama al mesero"}
                </span>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-coral">No se pudieron cargar los pedidos: {error}</p>}

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {COLUMNAS.map((col) => {
            const lista = pedidos.filter((p) => p.estado === col.estado);
            return (
              <section key={col.estado} className="bg-nightCard rounded-3xl p-4 min-h-[200px]">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-paper/80 px-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.punto}`} />
                  {col.titulo}
                  <span className="ml-auto tabular text-paper/50">{lista.length}</span>
                </h2>

                {cargando ? (
                  <p className="text-sm text-paper/40 mt-6 px-1">Cargando…</p>
                ) : lista.length === 0 ? (
                  <p className="text-sm text-paper/30 mt-6 px-1">Nada por aquí.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-3">
                    {lista.map((p) => {
                      const min = minutosDesde(p.creado_en, ahora);
                      const sig = SIGUIENTE[p.estado];
                      return (
                        <li key={p.id} className="bg-night/60 border border-white/5 rounded-2xl p-4 animate-fade-in-up">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-display text-2xl font-bold leading-none tabular">{numeroPedido(p.numero)}</p>
                              <p className="text-[13px] font-semibold text-paper/80 mt-1.5">{p.mesa?.nombre}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-[12px] font-semibold tabular ${colorEspera(min)}`} title={hace(p.creado_en, ahora)}>
                              {min} min
                            </span>
                          </div>

                          <ul className="mt-3 flex flex-col gap-1.5">
                            {p.items.map((i) => (
                              <li key={i.id} className="text-[15px] leading-snug">
                                <span className="font-bold tabular text-coral">{i.cantidad}×</span> {i.nombre}
                                {i.nota && <span className="block text-[13px] text-sun ml-6">→ {i.nota}</span>}
                              </li>
                            ))}
                          </ul>
                          {p.nota && (
                            <p className="mt-3 text-[13px] bg-sunLight text-night rounded-lg px-3 py-2">
                              <span className="font-semibold">Nota:</span> {p.nota}
                            </p>
                          )}

                          <div className="mt-4 flex gap-2">
                            {porCancelar === p.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => cancelar(p)}
                                  disabled={ocupado === p.id}
                                  className="flex-grow py-2.5 rounded-xl bg-coral text-white text-[13px] font-semibold"
                                >
                                  Sí, cancelar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPorCancelar(null)}
                                  className="px-4 py-2.5 rounded-xl bg-white/10 text-[13px] font-semibold"
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => avanzar(p)}
                                  disabled={ocupado === p.id}
                                  className={`flex-grow py-2.5 rounded-xl text-[14px] font-semibold disabled:opacity-60 ${
                                    p.estado === "listo" ? "bg-mint text-white" : "bg-paper text-night"
                                  }`}
                                >
                                  {sig.accion}
                                </button>
                                {p.estado === "recibido" && (
                                  <button
                                    type="button"
                                    onClick={() => setPorCancelar(p.id)}
                                    className="px-3 py-2.5 rounded-xl bg-white/5 text-paper/60 text-[13px] font-semibold hover:text-paper"
                                  >
                                    Cancelar
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
