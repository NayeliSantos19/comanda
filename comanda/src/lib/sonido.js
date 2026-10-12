// Los navegadores bloquean el audio hasta que la persona toca la pantalla,
// por eso desbloquearAudio() se llama desde un botón.
let ctx = null;

export function desbloquearAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = ctx || new AC();
  if (ctx.state === "suspended") ctx.resume();
}

export function audioListo() {
  return !!ctx && ctx.state === "running";
}

// Tonos generados con Web Audio, sin archivos de sonido
function tono(notas) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  notas.forEach(([freq, retraso]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + retraso);
    gain.gain.exponentialRampToValueAtTime(0.4, t0 + retraso + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + retraso + 0.7);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0 + retraso);
    osc.stop(t0 + retraso + 0.8);
  });
}

// Pedido nuevo en cocina: tres notas que suben
export const timbrePedido = () => tono([[660, 0], [880, 0.15], [1100, 0.3]]);
// Un cliente llamó al mesero
export const timbreLlamado = () => tono([[990, 0], [990, 0.25]]);
// Al cliente: su pedido está listo
export const timbreListo = () => tono([[880, 0], [660, 0.35]]);
