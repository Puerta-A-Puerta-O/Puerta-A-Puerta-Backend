// tests/auth.test.js
const request = require('supertest');
// Nota: Importar la instancia app desvinculada del listen de Express
const app = require('../src/app'); 

describe('POST /api/v1/auth/register', () => {
  it('Debería rechazar un registro con email inválido', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        nombre: 'Usuario Test',
        email: 'email-invalido',
        password: '123'
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body.status).toBe('error');
  });
});