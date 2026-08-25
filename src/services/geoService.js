const turf = require('@turf/turf');
const geoRepository = require('../repositories/geoRepository');

const UMBRAL_LLEGADA_METROS = 100;
const TARIFA_BASE = 500;
const PRECIO_POR_KM = 300;

class GeoService {
  /**
   * Métodos en memoria usando Turf.js (en tiempo real)
   */
  calcularDistanciaMetros(lat1, lng1, lat2, lng2) {
    const origen = turf.point([lng1, lat1]);
    const destino = turf.point([lng2, lat2]);
    const distanciaKm = turf.distance(origen, destino, { units: 'kilometers' });
    return Math.round(distanciaKm * 1000);
  }

  estimarTiempoMinutos(distanciaMetros, velocidadKmh = 25) {
    if (distanciaMetros <= 0) return 0;
    const velocidadMps = (velocidadKmh * 1000) / 3600;
    return Math.ceil((distanciaMetros / velocidadMps) / 60);
  }

  estaEnGeocercaLlegada(distanciaMetros) {
    return distanciaMetros <= UMBRAL_LLEGADA_METROS;
  }

  /**
   * Métodos con PostGIS (consultas espaciales a la BD)
   */
  async calculateDeliveryFee(localId, latitudCliente, longitudCliente) {
    const distanciaMetros = await geoRepository.calculateDeliveryDistance(
      localId,
      latitudCliente,
      longitudCliente
    );

    const distanciaKm = distanciaMetros / 1000;
    const costoEnvio = Math.round(TARIFA_BASE + (distanciaKm * PRECIO_POR_KM));

    return {
      distanciaMetros,
      distanciaKm: Number(distanciaKm.toFixed(2)),
      costoEnvio
    };
  }
}

module.exports = new GeoService();