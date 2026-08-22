// tests/socket.test.js
const io = require('socket.io-client');
const http = require('http');
const app = require('../src/app');
const db = require('../src/config/db');
const request = require('supertest');

describe('⚡ Pruebas en Tiempo Real - WebSockets (Socket.io)', () => {
  let server;
  let socketCliente;
  let socketRepartidor;
  let tokenCliente;
  let tokenRepartidor;
  let pedidoIdPrueba;
  const PORT = 4001;
  const SERVER_URL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    // 1. Levantar servidor HTTP de pruebas
    server = http.createServer(app);
    
    // Inicializar servidor Socket.io si tu módulo expone un constructor o método de binding
    const socketService = require('../src/sockets/socketService'); // Ajustá la ruta según tu arquitectura
    socketService.init(server);

    await new Promise((resolve) => server.listen(PORT, resolve));

    // 2. Autenticar Cliente y Repartidor para obtener Tokens JWT
    const resCliente = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'cliente@prueba.com', password: 'Password123!' });
    tokenCliente = resCliente.body.token || resCliente.body.data?.token;

    const resRepartidor = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'repartidor@prueba.com', password: 'Password123!' });
    tokenRepartidor = resRepartidor.body.token || resRepartidor.body.data?.token;

    // 3. Obtener un Pedido existente
    const pedidoRes = await db.query('SELECT id FROM pedidos LIMIT 1;');
    pedidoIdPrueba = pedidoRes.rows[0].id;
  });

  afterAll(async () => {
    if (socketCliente?.connected) socketCliente.disconnect();
    if (socketRepartidor?.connected) socketRepartidor.disconnect();
    await new Promise((resolve) => server.close(resolve));
    await db.pool.end();
  });

  // 1. Rechazar conexiones sin token JWT
  it('Debería rechazar conexiones por WebSocket sin token JWT válido', (done) => {
    const socketSinAuth = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: false
    });

    socketSinAuth.on('connect_error', (err) => {
      expect(err.message).toMatch(/autenticación|token/i);
      socketSinAuth.disconnect();
      done();
    });
  });

  // 2. Conexión y Telemetría GPS en tiempo real
  it('Debería retransmitir la ubicación GPS del repartidor al cliente suscrito al pedido', (done) => {
    // A. Conectar Cliente
    socketCliente = io(SERVER_URL, {
      auth: { token: tokenCliente },
      transports: ['websocket']
    });

    socketCliente.on('connect', () => {
      // El cliente se une a la sala del pedido
      socketCliente.emit('unirse_pedido', { pedidoId: pedidoIdPrueba });

      // B. Conectar Repartidor
      socketRepartidor = io(SERVER_URL, {
        auth: { token: tokenRepartidor },
        transports: ['websocket']
      });

      socketRepartidor.on('connect', () => {
        const ubicacionMock = {
          pedidoId: pedidoIdPrueba,
          latitud: -34.603722,
          longitud: -58.381592,
          velocidad: 35.5
        };

        // Escuchar el evento de actualización en el cliente
        socketCliente.on('ubicacion_actualizada', (data) => {
          expect(data.pedidoId).toBe(pedidoIdPrueba);
          expect(data.latitud).toBe(ubicacionMock.latitud);
          expect(data.longitud).toBe(ubicacionMock.longitud);
          done();
        });

        // El repartidor transmite las coordenadas GPS
        socketRepartidor.emit('actualizar_ubicacion', ubicacionMock);
      });
    });
  });
});