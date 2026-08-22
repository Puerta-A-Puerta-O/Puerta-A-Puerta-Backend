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
  let tokenAdminLocal; // 1. Variable declarada correctamente
  let pedidoIdPrueba;
  const PORT = 4001;
  const SERVER_URL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    // 1. Levantar servidor HTTP de pruebas
    server = http.createServer(app);
    
    // Inicializar servidor Socket.io y vincular 'io' con Express app
    const socketService = require('../src/sockets/socketService');
    const ioServer = socketService.init(server);
    app.set('io', ioServer); // 2. Vinculación clave para que orderController capture 'io'

    await new Promise((resolve) => server.listen(PORT, resolve));

    // 2. Autenticar Cliente, Repartidor y Admin Local para obtener Tokens JWT
    const resCliente = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'cliente@prueba.com', password: 'Password123!' });
    tokenCliente = resCliente.body.token || resCliente.body.data?.token;

    const resRepartidor = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'repartidor@prueba.com', password: 'Password123!' });
    tokenRepartidor = resRepartidor.body.token || resRepartidor.body.data?.token;

    const resAdmin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'local@prueba.com', password: 'Password123!' });
    tokenAdminLocal = resAdmin.body.token || resAdmin.body.data?.token;

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
    socketCliente = io(SERVER_URL, {
      auth: { token: tokenCliente },
      transports: ['websocket']
    });

    socketCliente.on('connect', () => {
      socketCliente.emit('unirse_pedido', { pedidoId: pedidoIdPrueba });

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

        socketCliente.on('ubicacion_actualizada', (data) => {
          expect(data.pedidoId).toBe(pedidoIdPrueba);
          expect(data.latitud).toBe(ubicacionMock.latitud);
          expect(data.longitud).toBe(ubicacionMock.longitud);
          socketCliente.disconnect();
          socketRepartidor.disconnect();
          done();
        });

        socketRepartidor.emit('actualizar_ubicacion', ubicacionMock);
      });
    });
  });

  // 3. Notificaciones push al cambiar estado por HTTP REST
  it('Debería emitir el evento "estado_actualizado" cuando se cambia el estado del pedido vía REST', (done) => {
    socketCliente = io(SERVER_URL, {
      auth: { token: tokenCliente },
      transports: ['websocket']
    });

    socketCliente.on('connect', () => {
      socketCliente.emit('unirse_pedido', { pedidoId: pedidoIdPrueba });

      socketCliente.on('estado_actualizado', (data) => {
        expect(data.nuevoEstado).toBe('confirmado');
        socketCliente.disconnect();
        done();
      });

      request(app)
        .patch(`/api/v1/pedidos/${pedidoIdPrueba}/estado`)
        .set('Authorization', `Bearer ${tokenAdminLocal}`)
        .send({ estado: 'confirmado' })
        .end((err) => {
          if (err) done(err);
        });
    });
  });
});