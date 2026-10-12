import { supabase } from "./supabaseClient";

// Las fotos de Unsplash aceptan parámetros de tamaño: así el celular baja una foto chica.
export function fotoUrl(url, ancho = 400) {
  if (!url) return null;
  if (url.includes("images.unsplash.com")) {
    const base = url.split("?")[0];
    return `${base}?auto=format&fit=crop&w=${ancho}&h=${ancho}&q=70`;
  }
  return url;
}

// Reduce la foto en el navegador antes de subirla (máx. 900 px, JPG)
async function reducir(archivo, maximo = 900) {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext("2d").drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  return new Promise((ok) => lienzo.toBlob(ok, "image/jpeg", 0.82));
}

// Sube la foto a Supabase Storage (carpeta "platos") y devuelve su URL pública
export async function subirFotoPlato(archivo) {
  if (!archivo.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  const blob = await reducir(archivo);
  const ruta = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from("platos").upload(ruta, blob, { contentType: "image/jpeg" });
  if (error) {
    if (/bucket/i.test(error.message)) throw new Error("Falta correr supabase-fotos.sql en Supabase.");
    throw new Error("No se pudo subir la foto: " + error.message);
  }
  return supabase.storage.from("platos").getPublicUrl(ruta).data.publicUrl;
}
