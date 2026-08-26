const localRepository = require('../repositories/localRepository');

class LocalController {
  async create(req, res) {
    try {
      const { nombre, descripcion, direccion, telefono, longitud, latitud, imagenUrl } = req.body;
      const usuarioId = req.user.id;

      if (!nombre || !direccion || !telefono || longitud === undefined || latitud === undefined) {
        return res.status(400).json({ error: 'Nombre, dirección, teléfono y coordenadas son obligatorios' });
      }

      const newLocal = await localRepository.create({
        usuarioId, nombre, descripcion, direccion, telefono, longitud, latitud, imagenUrl
      });

      return res.status(201).json({ status: 'success', data: newLocal });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getNearby(req, res) {
    try {
      const { lng, lat, radio } = req.query;

      if (!lng || !lat) {
        return res.status(400).json({ error: 'Los parámetros lng y lat son obligatorios' });
      }

      const locales = await localRepository.findByLocation(
        parseFloat(lng), 
        parseFloat(lat), 
        radio ? parseFloat(radio) : 5
      );

      return res.status(200).json({ status: 'success', total: locales.length, data: locales });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async setCoverage(req, res) {
    try {
      const { id } = req.params;
      const { coordenadas } = req.body; // Array de pares [[lng, lat], ...]

      if (!Array.isArray(coordenadas) || coordenadas.length < 3) {
        return res.status(400).json({ error: 'Se requiere un array de al menos 3 coordenadas para formar un polígono' });
      }

      // Cerrar el polígono automáticamente si el primer y último punto no coinciden
      const first = coordenadas[0];
      const last = coordenadas[coordenadas.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coordenadas.push(first);
      }

      const updated = await localRepository.updateCoverage(id, coordenadas);
      return res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new LocalController();