// src/controllers/authController.js
const authService = require('../services/authService');

class AuthController {
  async register(req, res) {
    try {
      const { nombre, email, telefono, password, rol } = req.body;

      const result = await authService.register({ nombre, email, telefono, password, rol });
      return res.status(201).json(result);
    } catch (error) {
      return res.status(error.statusCode || 400).json({ error: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const result = await authService.login(email, password);
      return res.status(200).json(result);
    } catch (error) {
      return res.status(error.statusCode || 401).json({ error: error.message });
    }
  }
}

module.exports = new AuthController();
