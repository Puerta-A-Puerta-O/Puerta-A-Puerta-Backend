// src/utils/orderStatusMap.js
const ALLOWED_TRANSITIONS = {
  creado: ['confirmado', 'cancelado'],
  confirmado: ['en_preparacion', 'cancelado'],
  en_preparacion: ['listo_para_entrega', 'cancelado'],
  listo_para_entrega: ['en_camino', 'cancelado'],
  en_camino: ['entregado', 'cancelado'],
  entregado: [], // Estado final
  cancelado: []  // Estado final
};

const isValidTransition = (currentStatus, nextStatus) => {
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(nextStatus) : false;
};

module.exports = {
  ALLOWED_TRANSITIONS,
  isValidTransition
};