// src/repositories/productRepository.js
const db = require('../config/db');

class ProductRepository {
  async findByLocalId(localId) {
    const query = `
      SELECT p.id, p.nombre, p.descripcion, p.precio, p.disponible, p.imagen_url,
             c.nombre AS categoria
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.local_id = $1 AND p.disponible = true
      ORDER BY c.orden ASC, p.nombre ASC;
    `;
    const { rows } = await db.query(query, [localId]);
    return rows;
  }

  async create(productData) {
    const { localId, categoriaId, nombre, descripcion, precio, imagenUrl } = productData;
    const query = `
      INSERT INTO productos (local_id, categoria_id, nombre, descripcion, precio, imagen_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [localId, categoriaId, nombre, descripcion, precio, imagenUrl]);
    return rows[0];
  }
}

module.exports = new ProductRepository();