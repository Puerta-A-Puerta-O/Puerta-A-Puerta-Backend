// src/repositories/userRepository.js
const db = require('../config/db');

class UserRepository {
  async findByEmail(email) {
    const query = 'SELECT * FROM usuarios WHERE email = $1;';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  async findById(id) {
    const query = 'SELECT id, nombre, email, telefono, rol, creado_en FROM usuarios WHERE id = $1;';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  async create({ nombre, email, telefono, passwordHash, rol = 'cliente' }) {
    const query = `
      INSERT INTO usuarios (nombre, email, telefono, password, rol)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nombre, email, telefono, rol, creado_en;
    `;
    const values = [nombre, email, telefono, passwordHash, rol];
    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = new UserRepository();