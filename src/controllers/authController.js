// src/controllers/authController.js
const authService = require('../services/authService');

class AuthController {
  async register(req, res) {
    try {
      const { nombre, email, telefono, password, rol } = req.body;

      if (!nombre || !email || !telefono || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
      }

      const result = await authService.register({ nombre, email, telefono, password, rol });
      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña requeridos' });
      }

      const result = await authService.login(email, password);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(401).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();