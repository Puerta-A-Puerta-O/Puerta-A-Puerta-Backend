// src/utils/orderStateMachine.js

const ESTADOS = {
  CREADO: 'creado',
  CONFIRMADO: 'confirmado',
  EN_PREPARACION: 'en_preparacion',
  LISTO_PARA_RETIRAR: 'listo_para_retirar',
  EN_CAMINO: 'en_camino',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
};

// Mapa de transiciones permitidas según el estado actual
const TRANSICIONES_PERMITIDAS = {
  [ESTADOS.CREADO]: [ESTADOS.CONFIRMADO, ESTADOS.CANCELADO],
  [ESTADOS.CONFIRMADO]: [ESTADOS.EN_PREPARACION, ESTADOS.CANCELADO],
  [ESTADOS.EN_PREPARACION]: [ESTADOS.LISTO_PARA_RETIRAR, ESTADOS.CANCELADO],
  [ESTADOS.LISTO_PARA_RETIRAR]: [ESTADOS.EN_CAMINO, ESTADOS.CANCELADO],
  [ESTADOS.EN_CAMINO]: [ESTADOS.ENTREGADO, ESTADOS.CANCELADO],
  [ESTADOS.ENTREGADO]: [], // Estado final
  [ESTADOS.CANCELADO]: [], // Estado final
};

function esTransicionValida(estadoActual, nuevoEstado) {
  const permitidos = TRANSICIONES_PERMITIDAS[estadoActual] || [];
  return permitidos.includes(nuevoEstado);
}

module.exports = { ESTADOS, esTransicionValida };