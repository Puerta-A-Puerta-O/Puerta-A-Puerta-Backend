// src/middlewares/ownershipMiddleware.js
const authorizationService = require('../services/authorizationService');
const httpError = require('../utils/httpError');

function wrap(check) {
  return async (req, res, next) => {
    try {
      await check(req);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Exige que req.user sea dueño/admin del local indicado.
 * El ID se busca en params, body o query, en ese orden.
 */
const requireLocalOwnership = (paramName = 'localId') =>
  wrap(async (req) => {
    const localId =
      req.params?.[paramName] ||
      req.body?.[paramName] ||
      req.query?.[paramName];

    if (!localId) {
      throw httpError(`El parámetro ${paramName} es obligatorio`, 400);
    }

    await authorizationService.assertLocalOwnership(localId, req.user);
    req.localId = localId;
  });

/**
 * Exige acceso al pedido de la ruta. Deja el pedido en req.pedido
 * para evitar consultarlo dos veces.
 */
const requireOrderAccess = (options = {}) =>
  wrap(async (req) => {
    const pedidoId = req.params?.pedidoId || req.params?.id || req.body?.pedidoId || req.query?.pedidoId;
    req.pedido = await authorizationService.assertOrderAccess(pedidoId, req.user, options);
  });

const requireProductOwnership = () =>
  wrap(async (req) => {
    const localIdParam = req.params?.localId || null;
    req.producto = await authorizationService.assertProductOwnership(
      req.params?.id,
      req.user,
      localIdParam
    );
  });

const requireDriverAssigned = () =>
  wrap(async (req) => {
    const pedidoId = req.params?.pedidoId || req.body?.pedidoId;
    await authorizationService.assertDriverAssignedToOrder(pedidoId, req.user);
  });

module.exports = {
  requireLocalOwnership,
  requireOrderAccess,
  requireProductOwnership,
  requireDriverAssigned,
};
