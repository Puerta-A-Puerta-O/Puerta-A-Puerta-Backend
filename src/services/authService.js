// src/services/authService.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto_puerta_a_puerta_2026_super_seguro';
const JWT_EXPIRES_IN = '7d';

class AuthService {
  async register({ nombre, email, telefono, password, rol }) {
    const userExists = await userRepository.findByEmail(email);
    if (userExists) {
      throw new Error('El correo electrónico ya se encuentra registrado');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await userRepository.create({
      nombre,
      email,
      telefono,
      passwordHash,
      rol,
    });

    const token = this.generateToken(newUser);
    return { user: newUser, token };
  }

  async login(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Credenciales inválidas');
    }

    // Excluimos la contraseña de la respuesta
    delete user.password;
    const token = this.generateToken(user);
    return { user, token };
  }

  generateToken(user) {
    return jwt.sign(
      { id: user.id, rol: user.rol, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }
}

module.exports = new AuthService();