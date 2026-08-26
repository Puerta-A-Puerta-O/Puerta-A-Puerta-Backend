// src/repositories/localRepository.js
const db = require('../config/db');

class LocalRepository {
  async create({ usuarioId, nombre, descripcion, direccion, telefono, longitud, latitud, imagenUrl }) {
    const query = `
      INSERT INTO locales (usuario_id, nombre, descripcion, direccion, telefono, ubicacion, imagen_url)
      VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326), $8)
      RETURNING id, usuario_id, nombre, descripcion, direccion, telefono, 
                ST_X(ubicacion::geometry) as longitud, 
                ST_Y(ubicacion::geometry) as latitud, 
                imagen_url, activo, creado_en;
    `;
    const values = [
      usuarioId, 
      nombre, 
      descripcion, 
      direccion, 
      telefono, 
      parseFloat(longitud), 
      parseFloat(latitud), 
      imagenUrl
    ];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  async findByLocation(longitud, latitud, radioKms = 5) {
    const query = `
      SELECT id, nombre, descripcion, direccion, telefono, imagen_url,
             ST_X(ubicacion::geometry) as longitud, 
             ST_Y(ubicacion::geometry) as latitud,
             ST_DistanceSphere(ubicacion::geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326)) / 1000 as distancia_km
      FROM locales
      WHERE activo = true
        AND (
          ST_DWithin(ubicacion::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3 * 1000)
          OR (cobertura IS NOT NULL AND ST_Contains(cobertura, ST_SetSRID(ST_MakePoint($1, $2), 4326)))
        )
      ORDER BY distancia_km ASC;
    `;
    const { rows } = await db.query(query, [parseFloat(longitud), parseFloat(latitud), parseFloat(radioKms)]);
    return rows;
  }

  async updateCoverage(localId, polygonCoordinates) {
    // Convierte el array de coordenadas [[lng, lat], ...] a WKT POLYGON
    const wktPolygon = `POLYGON((${polygonCoordinates.map(p => `${p[0]} ${p[1]}`).join(', ')}))`;
    
    const query = `
      UPDATE locales
      SET cobertura = ST_GeomFromText($1, 4326),
          actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, nombre, ST_AsGeoJSON(cobertura) as cobertura_geojson;
    `;
    const { rows } = await db.query(query, [wktPolygon, localId]);
    return rows[0];
  }
}

module.exports = new LocalRepository();