const formato = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// 1.5 -> "$1.50"
export function dinero(valor) {
  return formato.format(Number(valor) || 0);
}

// Número de pedido con ceros: 7 -> "#007"
export function numeroPedido(n) {
  return `#${String(n).padStart(3, "0")}`;
}
