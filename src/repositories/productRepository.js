const db = require('../config/db');

class ProductRepository {
  // Método individual necesario para validar precios y stock en OrderService
  async findById(id) {
    const query = `
      SELECT id, local_id, categoria_id, nombre, descripcion, precio, disponible, imagen_url
      FROM productos
      WHERE id = $1;
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }

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
    const { localId, categoriaId, nombre, descripcion, precio, imagenUrl, disponible } = productData;
    const query = `
      INSERT INTO productos (local_id, categoria_id, nombre, descripcion, precio, disponible, imagen_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const { rows } = await db.query(query, [
      localId,
      categoriaId || null,
      nombre,
      descripcion,
      precio,
      disponible ?? true,
      imagenUrl
    ]);
    return rows[0];
  }

  async updateStock(id, disponible) {
    const query = `
      UPDATE productos
      SET disponible = $1, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `;
    const { rows } = await db.query(query, [disponible, id]);
    return rows[0] || null;
  }
}

module.exports = new ProductRepository();