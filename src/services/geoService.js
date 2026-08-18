// src/services/geoService.js
const turf = require('@turf/turf');

// Radio de la geocerca en metros para considerar que el repartidor llegó
const UMBRAL_LLEGADA_METROS = 100;

class GeoService {
  /**
   * Calcula la distancia en metros entre dos puntos (lat, lng)
   */
  calcularDistanciaMetros(lat1, lng1, lat2, lng2) {
    const origen = turf.point([lng1, lat1]);
    const destino = turf.point([lng2, lat2]);
    
    // Turf calcula la distancia en kilómetros por defecto; convertimos a metros
    const distanciaKm = turf.distance(origen, destino, { units: 'kilometers' });
    return Math.round(distanciaKm * 1000);
  }

  /**
   * Estima el tiempo de llegada en minutos según una velocidad promedio estimada (ej: 25 km/h)
   */
  estimarTiempoMinutos(distanciaMetros, velocidadKmh = 25) {
    if (distanciaMetros <= 0) return 0;
    const velocidadMps = (velocidadKmh * 1000) / 3600; // Metros por segundo
    const segundos = distanciaMetros / velocidadMps;
    return Math.ceil(segundos / 60);
  }

  /**
   * Evalúa si el repartidor está dentro de la geocerca de llegada
   */
  estaEnGeocercaLlegada(distanciaMetros) {
    return distanciaMetros <= UMBRAL_LLEGADA_METROS;
  }
}

module.exports = new GeoService();