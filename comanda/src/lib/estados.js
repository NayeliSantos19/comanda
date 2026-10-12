// Flujo de un pedido: recibido -> preparando -> listo -> entregado (o cancelado)
export const ESTADOS = {
  recibido: { nombre: "Recibido", cliente: "La cocina recibió tu pedido", clase: "bg-sunLight text-sun", paso: 0 },
  preparando: { nombre: "Preparando", cliente: "Lo están preparando", clase: "bg-accentLight text-accent", paso: 1 },
  listo: { nombre: "Listo", cliente: "¡Listo! Ya te lo llevan", clase: "bg-coralLight text-coral", paso: 2 },
  entregado: { nombre: "Entregado", cliente: "Entregado en tu mesa", clase: "bg-mintLight text-mint", paso: 3 },
  cancelado: { nombre: "Cancelado", cliente: "Pedido cancelado", clase: "bg-line text-muted", paso: -1 },
};

export const PASOS = ["recibido", "preparando", "listo", "entregado"];

// Qué botón ve la cocina y a qué estado lleva
export const SIGUIENTE = {
  recibido: { estado: "preparando", accion: "Empezar", campo: "preparando_en" },
  preparando: { estado: "listo", accion: "Marcar listo", campo: "listo_en" },
  listo: { estado: "entregado", accion: "Entregado", campo: "entregado_en" },
};
