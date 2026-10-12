import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useMenu } from "../hooks/useMenu";
import { dinero } from "../lib/dinero";
import Navegacion from "../components/Navegacion.jsx";
import Modal from "../components/Modal.jsx";
import FotoPlato from "../components/FotoPlato.jsx";
import { subirFotoPlato } from "../lib/fotos";

const VACIO = { id: null, nombre: "", descripcion: "", precio: "", categoria_id: "", imagen_url: "" };

export default function Menu() {
  const { categorias, cargando, error, recargar } = useMenu();
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [borrar, setBorrar] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  async function alternarDisponible(plato) {
    await supabase.from("platos").update({ disponible: !plato.disponible }).eq("id", plato.id);
    recargar();
  }

  function abrir(plato, categoriaId) {
    setErrorForm(null);
    setBorrar(false);
    setEditando(
      plato
        ? { ...plato, descripcion: plato.descripcion ?? "", precio: String(plato.precio), imagen_url: plato.imagen_url ?? "" }
        : { ...VACIO, categoria_id: categoriaId }
    );
  }

  async function guardar(e) {
    e.preventDefault();
    const precio = Number(editando.precio);
    if (!editando.nombre.trim()) return setErrorForm("Escribe el nombre del plato.");
    if (Number.isNaN(precio) || precio < 0) return setErrorForm("El precio no es válido.");

    setGuardando(true);
    const datos = {
      nombre: editando.nombre.trim(),
      descripcion: editando.descripcion.trim() || null,
      precio: Math.round(precio * 100) / 100,
      categoria_id: editando.categoria_id,
    };
    // Solo mandamos la foto si la columna existe (si ya se corrió supabase-fotos.sql)
    const hayColumnaFoto = categorias.some((c) => c.platos.some((p) => "imagen_url" in p));
    if (hayColumnaFoto || editando.imagen_url) datos.imagen_url = editando.imagen_url || null;
    const categoria = categorias.find((c) => c.id === editando.categoria_id);
    const { error } = editando.id
      ? await supabase.from("platos").update(datos).eq("id", editando.id)
      : await supabase.from("platos").insert({ ...datos, orden: (categoria?.platos.length ?? 0) + 1 });
    setGuardando(false);
    if (error) return setErrorForm(error.message);
    setEditando(null);
    recargar();
  }

  async function elegirFoto(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setErrorForm(null);
    setSubiendo(true);
    try {
      const url = await subirFotoPlato(archivo);
      setEditando((ed) => ({ ...ed, imagen_url: url }));
    } catch (err) {
      setErrorForm(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  async function eliminar() {
    setGuardando(true);
    const { error } = await supabase.from("platos").delete().eq("id", editando.id);
    setGuardando(false);
    if (error) return setErrorForm(error.message);
    setEditando(null);
    recargar();
  }

  async function agregarCategoria(e) {
    e.preventDefault();
    const nombre = nuevaCategoria.trim();
    if (!nombre) return;
    await supabase.from("categorias").insert({ nombre, orden: categorias.length + 1 });
    setNuevaCategoria("");
    recargar();
  }

  const agotados = categorias.flatMap((c) => c.platos).filter((p) => !p.disponible).length;

  return (
    <div className="min-h-screen px-5 sm:px-8 py-6 max-w-4xl mx-auto">
      <Navegacion />

      <div className="mt-7">
        <h1 className="font-display text-3xl font-bold">Menú</h1>
        <p className="text-sm text-muted mt-1">
          Marca un plato como agotado y desaparece del pedido al instante.
          {agotados > 0 && <span className="text-coral font-semibold"> {agotados} agotado{agotados > 1 ? "s" : ""} ahora.</span>}
        </p>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {cargando && <p className="mt-6 text-sm text-muted">Cargando…</p>}

      {categorias.map((c) => (
        <section key={c.id} className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">{c.nombre}</h2>
            <button type="button" onClick={() => abrir(null, c.id)} className="text-[13px] font-semibold text-accent">
              + Agregar plato
            </button>
          </div>
          <ul className="mt-3 bg-white border border-line rounded-2xl divide-y divide-line">
            {c.platos.length === 0 && <li className="px-4 py-4 text-sm text-muted">Sin platos todavía.</li>}
            {c.platos.map((p) => (
              <li key={p.id} className="px-4 py-3 flex items-center gap-3">
                <FotoPlato plato={p} tam={44} ancho={120} className={p.disponible ? "" : "grayscale opacity-60"} />
                <button type="button" onClick={() => abrir(p)} className="flex-grow min-w-0 text-left">
                  <p className={`font-semibold text-[15px] ${p.disponible ? "" : "text-muted line-through"}`}>{p.nombre}</p>
                  {p.descripcion && <p className="text-[12px] text-muted truncate">{p.descripcion}</p>}
                </button>
                <span className="tabular font-semibold text-[14px]">{dinero(p.precio)}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={p.disponible}
                  aria-label={`${p.nombre} disponible`}
                  onClick={() => alternarDisponible(p)}
                  className={`shrink-0 w-[92px] py-1.5 rounded-full text-[12px] font-semibold transition ${
                    p.disponible ? "bg-mintLight text-mint" : "bg-coralLight text-coral"
                  }`}
                >
                  {p.disponible ? "Disponible" : "Agotado"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <form onSubmit={agregarCategoria} className="mt-8 flex gap-2 max-w-sm">
        <input
          value={nuevaCategoria}
          onChange={(e) => setNuevaCategoria(e.target.value)}
          placeholder="Nueva categoría (ej. Desayunos)"
          maxLength={40}
          className="flex-grow px-3.5 py-2.5 rounded-xl border border-line bg-white text-sm"
        />
        <button type="submit" className="px-4 py-2.5 rounded-xl bg-ink text-paper text-sm font-semibold">
          Agregar
        </button>
      </form>

      <Modal abierto={!!editando} onCerrar={() => setEditando(null)} titulo={editando?.id ? "Editar plato" : "Nuevo plato"}>
        {editando && (
          <form onSubmit={guardar} className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <FotoPlato plato={{ nombre: editando.nombre || "?", imagen_url: editando.imagen_url }} tam={88} ancho={240} />
              <div className="flex flex-col items-start gap-1.5">
                <label className={`px-4 py-2 rounded-xl text-[13px] font-semibold cursor-pointer ${subiendo ? "bg-line text-muted" : "bg-ink text-white"}`}>
                  {subiendo ? "Subiendo…" : editando.imagen_url ? "Cambiar foto" : "Subir foto"}
                  <input type="file" accept="image/*" onChange={elegirFoto} disabled={subiendo} className="sr-only" />
                </label>
                {editando.imagen_url && !subiendo && (
                  <button type="button" onClick={() => setEditando({ ...editando, imagen_url: "" })} className="text-[12px] font-semibold text-coral">
                    Quitar foto
                  </button>
                )}
                <span className="text-[11px] text-muted">JPG o PNG. Se reduce sola antes de subir.</span>
              </div>
            </div>
            <Campo titulo="Nombre">
              <input
                required
                maxLength={60}
                value={editando.nombre}
                onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                className="w-full px-3.5 py-3 rounded-xl border border-line bg-white text-sm"
              />
            </Campo>
            <Campo titulo="Descripción (opcional)">
              <textarea
                rows={2}
                maxLength={140}
                value={editando.descripcion}
                onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                className="w-full px-3.5 py-3 rounded-xl border border-line bg-white text-sm resize-none"
              />
            </Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo titulo="Precio (USD)">
                <input
                  required
                  inputMode="decimal"
                  value={editando.precio}
                  onChange={(e) => setEditando({ ...editando, precio: e.target.value.replace(",", ".") })}
                  className="w-full px-3.5 py-3 rounded-xl border border-line bg-white text-sm tabular"
                />
              </Campo>
              <Campo titulo="Categoría">
                <select
                  value={editando.categoria_id}
                  onChange={(e) => setEditando({ ...editando, categoria_id: e.target.value })}
                  className="w-full px-3 py-3 rounded-xl border border-line bg-white text-sm"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            {errorForm && <p className="text-[13px] text-red-600">{errorForm}</p>}

            <button type="submit" disabled={guardando || subiendo} className="bg-accent text-paper rounded-xl py-3.5 font-semibold disabled:opacity-60">
              {guardando ? "Guardando…" : "Guardar"}
            </button>

            {editando.id &&
              (borrar ? (
                <div className="flex items-center justify-between gap-3 bg-coralLight rounded-xl px-3 py-2.5">
                  <span className="text-[13px] text-coral font-semibold">¿Eliminar este plato?</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={eliminar} className="px-3 py-1.5 rounded-lg bg-coral text-white text-[12px] font-semibold">
                      Eliminar
                    </button>
                    <button type="button" onClick={() => setBorrar(false)} className="px-3 py-1.5 rounded-lg bg-white text-[12px] font-semibold">
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setBorrar(true)} className="text-[13px] font-semibold text-coral">
                  Eliminar plato
                </button>
              ))}
          </form>
        )}
      </Modal>
    </div>
  );
}

function Campo({ titulo, children }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold mb-1.5">{titulo}</span>
      {children}
    </label>
  );
}
