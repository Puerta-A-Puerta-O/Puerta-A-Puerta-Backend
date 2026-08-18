# 🚪 Puerta a Puerta - Backend API & Real-Time Tracking

Servidor API REST y motor de telemetría geoespacial en tiempo real para la plataforma **Puerta a Puerta**. Construido sobre Node.js, Express, Socket.io y PostgreSQL con extensión PostGIS, bajo una arquitectura modular limpia en 3 capas.

---

## 🛠️ Tecnologías Principales

* **Entorno de ejecución:** Node.js (v20+) / Express
* **Base de Datos & GIS:** PostgreSQL 15 + PostGIS (Gestión de coordenadas, espacios vectoriales e índices GiST)
* **Contenedores:** Docker & Docker Compose
* **Comunicación en Vivo:** Socket.io (WebSockets para tracking GPS)
* **Seguridad:** JWT (JSON Web Tokens) & Bcrypt
* **Cálculos Espaciales en Memoria:** Turf.js (Geocercas de proximidad y ETA)
* **Validación de Datos:** Express Validator

---

## 🏗️ Arquitectura del Proyecto

El backend utiliza una **Arquitectura en 3 Capas (Controller - Service - Repository)** para garantizar el desacoplamiento, testabilidad y escalabilidad del código.

```text
src/
├── config/          # Conexiones a PostgreSQL y variables globales
├── controllers/     # Controladores HTTP (Manejo de req, res y códigos HTTP)
├── services/        # Lógica de negocio (Máquina de estados, Turf.js, JWT)
├── repositories/    # Capa de datos (Consultas SQL y funciones PostGIS)
├── routes/          # Definición de endpoints REST (/api/v1/...)
├── sockets/         # Handlers de WebSockets para rastreo GPS
├── validators/      # Middleware de esquemas de validación (express-validator)
├── middlewares/     # Seguridad (JWT) y Manejo Global de Errores
└── utils/           # Constantes, tipos de error y helpers