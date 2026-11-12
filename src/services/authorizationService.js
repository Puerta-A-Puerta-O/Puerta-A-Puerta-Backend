// src/services/authorizationService.js
// Punto único de verdad para responder: ¿este usuario puede tocar este recurso?
const db = require('../config/db');
const httpError = require('../utils/httpError');

const ROLES = Object.freeze({
  CLIENTE: 'cliente',
  REPARTIDOR: 'repartidor',
  ADMIN_LOCAL: 'admin_local',
  SUPERADMIN: 'superadmin',
});

function rolDe(user) {
  return user?.rol || user?.role || null;
}

class AuthorizationService {
  isSuperadmin(user) {
    return rolDe(user) === ROLES.SUPERADMIN;
  }

  isAdminLocal(user) {
    return rolDe(user) === ROLES.ADMIN_LOCAL;
  }

  isStaff(user) {
    return [ROLES.ADMIN_LOCAL, ROLES.SUPERADMIN].includes(rolDe(user));
  }

  /**
   * Devuelve los IDs de locales que administra el usuario.
   * Para superadmin devuelve null (sin restricción).
   */
  async getOwnedLocalIds(user) {
    if (this.isSuperadmin(user)) return null;
    if (!user?.id) throw httpError('Usuario no autenticado', 401);

    const { rows } = await db.query(
      `
      SELECT DISTINCT l.id
      FROM locales l
      LEFT JOIN usuario_locales ul ON ul.local_id = l.id
      WHERE l.usuario_id = $1 OR ul.usuario_id = $1;
      `,
      [user.id]
    );

    return rows.map((row) => row.id);
  }

  async assertLocalOwnership(localId, user) {
    if (!user?.id) throw httpError('Usuario no autenticado', 401);
    if (this.isSuperadmin(user)) return true;
    if (!localId) throw httpError('El ID del local es obligatorio', 400);

    const { rows } = await db.query(
      `
      SELECT l.id,
             (l.usuario_id = $2 OR ul.usuario_id IS NOT NULL) AS owned
      FROM locales l
      LEFT JOIN usuario_locales ul
        ON ul.local_id = l.id AND ul.usuario_id = $2
      WHERE l.id = $1
      LIMIT 1;
      `,
      [localId, user.id]
    );

    if (rows.length === 0) {
      throw httpError('Local no encontrado', 404);
    }

    if (!rows[0].owned) {
      throw httpError('No tenés acceso a este local', 403);
    }

    return true;
  }

  async assertOrderAccess(pedidoId, user, { allowUnassignedDriver = false } = {}) {
    if (!user?.id) throw httpError('Usuario no autenticado', 401);
    if (!pedidoId) throw httpError('El ID del pedido es obligatorio', 400);

    const { rows } = await db.query(
      `
      SELECT id, cliente_id, local_id, repartidor_id, estado
      FROM pedidos
      WHERE id = $1;
      `,
      [pedidoId]
    );

    const pedido = rows[0];
    if (!pedido) throw httpError('Pedido no encontrado', 404);

    if (this.isSuperadmin(user)) return pedido;

    const rol = rolDe(user);

    if (rol === ROLES.CLIENTE) {
      if (pedido.cliente_id !== user.id) {
        throw httpError('No tenés acceso a este pedido', 403);
      }
      return pedido;
    }

    if (rol === ROLES.REPARTIDOR) {
      if (pedido.repartidor_id === user.id) return pedido;
      if (allowUnassignedDriver && !pedido.repartidor_id) return pedido;
      throw httpError('No tenés acceso a este pedido', 403);
    }

    if (rol === ROLES.ADMIN_LOCAL) {
      await this.assertLocalOwnership(pedido.local_id, user);
      return pedido;
    }

    throw httpError('No tenés acceso a este pedido', 403);
  }

  async assertDriverAssignedToOrder(pedidoId, user) {
    if (!user?.id) throw httpError('Usuario no autenticado', 401);
    if (this.isSuperadmin(user)) return true;

    if (rolDe(user) !== ROLES.REPARTIDOR) {
      throw httpError('Solo un repartidor puede registrar telemetría', 403);
    }

    const { rows } = await db.query(
      'SELECT repartidor_id FROM pedidos WHERE id = $1;',
      [pedidoId]
    );

    if (!rows[0]) throw httpError('Pedido no encontrado', 404);

    if (rows[0].repartidor_id !== user.id) {
      throw httpError('El pedido no está asignado a este repartidor', 403);
    }

    return true;
  }

  async assertProductOwnership(productId, user, localIdParam = null) {
    if (!user?.id) throw httpError('Usuario no autenticado', 401);
    if (!productId) throw httpError('El ID del producto es obligatorio', 400);

    const { rows } = await db.query(
      'SELECT id, local_id FROM productos WHERE id = $1;',
      [productId]
    );

    const producto = rows[0];
    if (!producto) throw httpError('Producto no encontrado', 404);

    if (localIdParam && producto.local_id !== localIdParam) {
      throw httpError('El producto no pertenece al local indicado', 404);
    }

    await this.assertLocalOwnership(producto.local_id, user);
    return producto;
  }
}

module.exports = new AuthorizationService();
module.exports.ROLES = ROLES;
