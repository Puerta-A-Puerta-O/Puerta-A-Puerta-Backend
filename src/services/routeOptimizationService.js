// src/services/routeOptimizationService.js

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class RouteOptimizationService {
  /**
   * Pondera tiempo de espera vs. desviación geográfica (Ahorro de combustible y tiempo)
   */
  optimizeSmartDeliveryRoute(origen, pedidos) {
    if (!pedidos || pedidos.length === 0) return [];

    const pendientes = [...pedidos];
    const rutaOptimizada = [];
    let puntoActual = { latitud: origen.latitud, longitud: origen.longitud };

    const PESO_TIEMPO = 1.5;
    const PESO_DISTANCIA = 3.0;
    const MAX_ESPERA_CRITICA = 45;

    while (pendientes.length > 0) {
      let mejorIndice = 0;
      let mejorPuntaje = -Infinity;

      for (let i = 0; i < pendientes.length; i++) {
        const item = pendientes[i];
        const distKm = calcularDistanciaKm(
          puntoActual.latitud,
          puntoActual.longitud,
          item.latitud,
          item.longitud
        );

        const minutosEspera = Number(item.minutos_espera) || 0;
        const bonificacionUrgencia = minutosEspera > MAX_ESPERA_CRITICA ? 50 : 0;

        const score = (minutosEspera * PESO_TIEMPO) + bonificacionUrgencia - (distKm * PESO_DISTANCIA);

        if (score > mejorPuntaje) {
          mejorPuntaje = score;
          mejorIndice = i;
        }
      }

      const siguientePedido = pendientes.splice(mejorIndice, 1)[0];
      const distRecorrida = calcularDistanciaKm(
        puntoActual.latitud,
        puntoActual.longitud,
        siguientePedido.latitud,
        siguientePedido.longitud
      );

      siguientePedido.distanciaTramoKm = Number(distRecorrida.toFixed(2));
      siguientePedido.ordenSugerido = rutaOptimizada.length + 1;

      rutaOptimizada.push(siguientePedido);
      puntoActual = { latitud: siguientePedido.latitud, longitud: siguientePedido.longitud };
    }

    return rutaOptimizada;
  }
}

module.exports = new RouteOptimizationService();