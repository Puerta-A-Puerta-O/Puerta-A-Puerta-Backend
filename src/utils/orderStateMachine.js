const ESTADOS = {
  CREADO: 'creado',
  CONFIRMADO: 'confirmado',
  EN_PREPARACION: 'en_preparacion',
  LISTO_PARA_ENTREGA: 'listo_para_entrega',
  LISTO_PARA_RETIRAR: 'listo_para_retirar',
  EN_CAMINO: 'en_camino',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
};

const TRANSICIONES_VALIDAS = {
  [ESTADOS.CREADO]: [ESTADOS.CONFIRMADO, ESTADOS.CANCELADO],
  [ESTADOS.CONFIRMADO]: [ESTADOS.EN_PREPARACION, ESTADOS.CANCELADO],
  
  // 🟢 PERMITIR TANTO 'LISTO_PARA_RETIRAR' COMO 'EN_CAMINO'
  [ESTADOS.EN_PREPARACION]: [
    ESTADOS.LISTO_PARA_RETIRAR, 
    ESTADOS.EN_CAMINO, 
    ESTADOS.CANCELADO
  ],
  
  [ESTADOS.LISTO_PARA_RETIRAR]: [ESTADOS.EN_CAMINO, ESTADOS.CANCELADO],
  [ESTADOS.EN_CAMINO]: [ESTADOS.ENTREGADO, ESTADOS.CANCELADO],
  [ESTADOS.ENTREGADO]: [],
  [ESTADOS.CANCELADO]: []
};

function esTransicionValida(estadoActual, nuevoEstado) {
  const permitidos = TRANSICIONES_VALIDAS[estadoActual] || [];
  return permitidos.includes(nuevoEstado);
}

module.exports = {
  ESTADOS,
  esTransicionValida,
};