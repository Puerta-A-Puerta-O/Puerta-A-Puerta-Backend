// src/middlewares/coverageMiddleware.js
const geoRepository = require('../repositories/geoRepository');

const checkDeliveryCoverage = async (req, res, next) => {
  try {
    const { localId, latitud, longitud } = req.body;

    // Si no vienen coordenadas en el body, dejamos que el validator principal maneje ese error de campos
    if (!localId || latitud === undefined || longitud === undefined) {
      return next();
    }

    const estaEnRango = await geoRepository.isLocationWithinCoverage(
      localId,
      latitud,
      longitud
    );

    if (!estaEnRango) {
      return res.status(400).json({
        status: 'fail',
        message: 'La dirección de entrega se encuentra fuera de la zona de cobertura del local.'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { checkDeliveryCoverage };