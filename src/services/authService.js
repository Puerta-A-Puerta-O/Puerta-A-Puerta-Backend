// src/services/authService.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const env = require('../config/env');
const { ROLES_PUBLICOS } = require('../validators/authValidator');

const SALT_ROUNDS = 10;

class AuthService {
  async register({ nombre, email, telefono, password, rol }) {
    const rolSolicitado = rol || 'cliente';

    if (!ROLES_PUBLICOS.includes(rolSolicitado)) {
      const error = new Error(`El rol '${rolSolicitado}' no puede registrarse públicamente`);
      error.statusCode = 403;
      throw error;
    }

    const userExists = await userRepository.findByEmail(email);
    if (userExists) {
      const error = new Error('El correo electrónico ya se encuentra registrado');
      error.statusCode = 409;
      throw error;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await userRepository.create({
      nombre,
      email,
      telefono,
      passwordHash,
      rol: rolSolicitado,
    });

    const token = this.generateToken(newUser);
    return { user: newUser, token };
  }

  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401;
      throw error;
    }

    // Excluimos la contraseña de la respuesta
    delete user.password;
    const token = this.generateToken(user);
    return { user, token };
  }

  generateToken(user) {
    return jwt.sign(
      { id: user.id, rol: user.rol, email: user.email },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );
  }
}

module.exports = new AuthService();
