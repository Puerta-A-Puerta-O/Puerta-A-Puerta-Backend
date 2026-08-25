🚀 Puerta a Puerta - Especificación de Endpoints (v1)
Base URL: http://localhost:3000/api/v1

Formato de datos: JSON (Content-Type: application/json)

Autenticación: Bearer Token (Authorization: Bearer <JWT_TOKEN>)

🔑 1. Autenticación (/auth)
POST /auth/register
Registra un nuevo usuario en la plataforma.

Headers: Content-Type: application/json

Body:

JSON
{
  "nombre": "John Arias",
  "email": "JonArias@puertaapuerta.com",
  "telefono": "+5493511234567",
  "password": "1379@Jonarias",
  "rol": "cliente"
}
rol opcional (por defecto: cliente). Valores válidos: 'cliente', 'repartidor', 'local', 'admin_local'.

Respuesta Exitosa (201 Created):

JSON
{
  "user": {
    "id": "uuid-1234-5678",
    "nombre": "John Arias",
    "email": "JonArias@puertaapuerta.com",
    "telefono": "+5493511234567",
    "rol": "cliente"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5..."
}
POST /auth/login
Autentica un usuario y devuelve el token de sesión.

Headers: Content-Type: application/json

Body:

JSON
{
  "email": "JonArias@puertaapuerta.com",
  "password": "1379@Jonarias"
}
Respuesta Exitosa (200 OK):

JSON
{
  "user": {
    "id": "uuid-1234-5678",
    "nombre": "John Arias",
    "email": "JonArias@puertaapuerta.com",
    "rol": "cliente"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5..."
}
📦 2. Pedidos y Seguimiento (/pedidos)
GET /pedidos/:pedidoId/tracking
Obtiene el historial completo de ubicaciones GPS de un pedido.

Headers: Authorization: Bearer <token>

Params: pedidoId (UUID en la URL)

Respuesta Exitosa (200 OK):

JSON
{
  "status": "success",
  "data": {
    "pedidoId": "d0ca0998-0243-4b10-9980-344ac8e5597f",
    "totalPuntos": 2,
    "ruta": [
      {
        "id": 1,
        "latitud": -31.4170,
        "longitud": -64.1840,
        "velocidad_kms": "25.00",
        "registrado_en": "2026-08-25T19:00:00.000Z"
      },
      {
        "id": 2,
        "latitud": -31.4175,
        "longitud": -64.1845,
        "velocidad_kms": "30.00",
        "registrado_en": "2026-08-25T19:01:00.000Z"
      }
    ]
  }
}
PATCH /pedidos/:pedidoId/estado
Actualiza el estado actual de la orden.

Headers: Authorization: Bearer <token> (requiere rol 'repartidor' o 'admin_local')

Params: pedidoId (UUID en la URL)

Body:

JSON
{
  "estado": "en_camino"
}
Valores válidos para estado: 'pendiente', 'asignado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'.

Respuesta Exitosa (200 OK):

JSON
{
  "status": "success",
  "message": "Estado del pedido actualizado correctamente",
  "data": {
    "pedidoId": "d0ca0998-0243-4b10-9980-344ac8e5597f",
    "estado": "en_camino"
  }
}
🛰️ 3. Eventos en Tiempo Real (WebSockets via Socket.io)
Conexión: ws://localhost:3000 (Pasando token en handshake auth)

Eventos a escuchar en Frontend:

posicion_actualizada: Emitido cuando el repartidor envía coordenadas.

JSON
{
  "pedidoId": "d0ca0998-0243-4b10-9980-344ac8e5597f",
  "latitud": -31.4175,
  "longitud": -64.1845,
  "velocidad_kms": 30.0
}
estado_cambiado: Emitido cuando cambia el ciclo de vida del pedido.