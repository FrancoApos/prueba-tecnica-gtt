# Backend — Chat App API

API REST en **NestJS + TypeScript + MongoDB (Mongoose)** para la prueba técnica de chat. Cubre autenticación, usuarios/perfiles, chats 1 a 1 y mensajes (texto + adjuntos).

Ver también: [modelado de datos](../docs/DATA_MODEL.md) y [decisiones técnicas](../docs/DECISIONS.md).

## Requisitos

- Node.js 24+ y npm (o Docker, ver más abajo).
- MongoDB 7+ corriendo en algún lado (local, Docker, Atlas...). No hace falta si solo vas a correr los tests (usan un Mongo en memoria).

## Variables de entorno

Copiá `.env.example` a `.env` y ajustá lo necesario:

| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto HTTP del backend | `3000` |
| `MONGODB_URI` | Connection string de MongoDB | `mongodb://localhost:27017/chat-app` |
| `JWT_SECRET` | Secreto para firmar los JWT | *(cambiar en cualquier entorno real)* |
| `JWT_EXPIRES_IN` | Vigencia del token | `1d` |
| `CORS_ORIGIN` | Origen permitido para CORS | `*` |
| `UPLOADS_DIR` | Carpeta donde se guardan los adjuntos | `uploads` |

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm run start:dev     # con watch, para desarrollo
npm run start         # sin watch
npm run build && npm run start:prod   # build + producción
```

Con el backend corriendo:

- API: `http://localhost:3000`
- Swagger: **`http://localhost:3000/docs`** (con soporte de Bearer auth — usá "Authorize" con el `accessToken` que devuelve `/auth/login`)
- Health check: `GET /health`

## Datos de prueba (seed)

Con Mongo corriendo y `MONGODB_URI` apuntando a él:

```bash
npm run seed
```

Esto **borra** las colecciones `users`, `chats` y `messages` de esa base y crea 3 usuarios (2 `user` + 1 `admin`) con un chat y algunos mensajes entre los dos primeros.

**Credenciales de prueba** (mismo password para las tres cuentas):

| Email | Password | Rol |
|---|---|---|
| `ana@example.com` | `Sup3rSecret!` | `user` |
| `bruno@example.com` | `Sup3rSecret!` | `user` |
| `admin@example.com` | `Sup3rSecret!` | `admin` |

## Docker

```bash
# Solo el backend (necesitás un Mongo aparte, ver MONGODB_URI):
docker build -t chat-app-backend .
docker run -p 3000:3000 -e MONGODB_URI=... -e JWT_SECRET=... chat-app-backend

# Backend + Mongo juntos (desde la raíz del repo):
docker compose up --build
```

`docker-compose.yml` (en la raíz del repo) levanta Mongo y el backend juntos, con un volumen para persistir los adjuntos entre reinicios del contenedor. El backend espera a que Mongo esté realmente listo (`healthcheck`, no solo "el contenedor arrancó") y **corre el seed automáticamente antes de levantar el server** — con un solo `docker compose up --build` la API queda arriba con las 3 cuentas de prueba ya cargadas, sin pasos manuales. Esto re-siembra la base en cada reinicio del contenedor (a propósito, para un entorno de evaluación/demo con estado conocido — no es el comportamiento que se querría en producción).

## Tests

```bash
npm run test        # unitarios (vitest)
npm run test:e2e    # flujo completo end-to-end (auth + users + chats + messages)
npm run test:cov    # con cobertura
npm run lint         # oxlint
```

Ambas suites son **reproducibles sin depender de un Mongo externo ni de Docker**: usan [`mongodb-memory-server`](https://github.com/typegoose/mongodb-memory-server) para levantar un Mongo real (no un mock) en memoria durante la corrida. El test e2e (`test/app.e2e-spec.ts`) recorre el flujo completo — alta de usuarios, login, credenciales inválidas, creación idempotente de chat, envío de mensaje, listado con `lastMessage`, y control de acceso (403 para quien no es parte del chat) — contra la app real, con los mismos pipes/filtros que producción (ver `src/setup-app.ts`).

## Arquitectura

```
src/
├── auth/          login, JWT, estrategia passport-jwt
├── users/          alta/consulta/edición/baja de usuarios, perfil
├── chats/          chats 1 a 1 entre usuarios
├── messages/        mensajes de un chat (texto y/o adjunto)
├── realtime/        gateway de Socket.IO (push de mensajes nuevos, autenticado con el mismo JWT)
├── common/          filtro de errores global, guard JWT, decorator @CurrentUser, DTO de paginado
├── config/          configuración tipada desde variables de entorno
├── setup-app.ts     pipes/filtros/CORS/estáticos compartidos entre main.ts y los tests e2e
├── main.ts          bootstrap (HTTP + Swagger)
└── seed.ts          datos de prueba
```

Cada módulo sigue el mismo patrón: `schema` (Mongoose) → `dto` (class-validator + Swagger) → `service` (lógica + acceso a datos) → `controller` (rutas HTTP).

## Rutas principales

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/users` | No | Alta de cuenta (ver nota abajo) |
| GET | `/users` | Sí | Listado con filtro de texto, paginado y orden |
| GET | `/users/:id` | Sí | Detalle de un usuario |
| PATCH | `/users/:id` | Sí (dueño o admin) | Edita un perfil — el propio siempre, el de otro solo con rol `admin` |
| DELETE | `/users/:id` | Sí (dueño o admin) | Borra una cuenta — la propia siempre, la de otro solo con rol `admin` |
| POST | `/auth/login` | No | Login, devuelve `accessToken` + usuario |
| POST | `/chats` | Sí | Abre (o reutiliza) el chat con `participantId` |
| GET | `/chats` | Sí | Chats del usuario autenticado, con contacto y último mensaje |
| POST | `/chats/:chatId/messages` | Sí | Envía un mensaje (texto y/o adjunto, `multipart/form-data`) |
| GET | `/chats/:chatId/messages` | Sí | Historial paginado, orden cronológico |

Documentación completa e interactiva en `/docs` (Swagger).

## Tiempo real (WebSocket)

El backend expone además un canal de Socket.IO **en el mismo puerto** que el HTTP (`ws://<host>:3000`), para que los participantes de un chat reciban los mensajes nuevos sin recargar.

- **Autenticación:** el mismo JWT del REST, en el handshake — `io(url, { auth: { token } })` (también se acepta el header `Authorization: Bearer <token>`). Sin token válido el server emite `auth:error` y desconecta.
- **Evento que emite el server:** `message:new`, con exactamente el mismo payload que devuelve `POST /chats/:chatId/messages`. Se emite a **todos** los participantes del chat, incluido el remitente (sus otras sesiones también lo necesitan), así que el cliente deduplica por `id`.
- **El cliente no escribe por WS:** enviar un mensaje sigue siendo el `POST` de siempre. El WS solo empuja lo que ya se persistió — ver la justificación en [`docs/DECISIONS.md`](../docs/DECISIONS.md) ("Tiempo real por WebSocket").
- **CORS:** el origen del gateway se toma de `CORS_ORIGIN` (igual que el HTTP).

## Decisiones relevantes (resumen)

Detalle completo en [`docs/DECISIONS.md`](../docs/DECISIONS.md). Puntos clave:

- **No hay pantalla/endpoint de "registro" separado**: `POST /users` es el alta de cuenta.
- **Roles acotados (self-or-admin), no un login admin separado**: un único flujo de login para todos (la consigna solo pide uno). `PATCH`/`DELETE /users/:id` los resuelve un `RolesGuard` genérico: el dueño del recurso siempre puede actuar sobre el suyo; actuar sobre el de otro requiere rol `admin` (`@Roles('admin')`). El rol nunca se acepta en `POST /users` (nadie se autopromueve) — el único admin de la app nace en el seed. Justificación completa en `docs/DECISIONS.md` ("Roles (self-or-admin), no un login admin separado").
- **Tiempo real como *push* sobre REST**: el gateway de Socket.IO no acepta escrituras; el mensaje se persiste por HTTP y recién entonces se empuja a los participantes. Evita duplicar validación/autorización en un segundo camino de escritura.
- **Chats solo 1 a 1** (no grupales) — ver `docs/DECISIONS.md` y `docs/DATA_MODEL.md`.
- **Adjuntos** se guardan en disco (`uploads/`, servida como estática en `/uploads/*`) — sin S3 ni base64, ver justificación en `docs/DECISIONS.md`.

## Alcance pendiente / conocido

- Sin recibos de lectura (doble check), indicador de "escribiendo…" ni edición/borrado de mensajes — no pedidos por la consigna.
- El `status`/`lastSeenAt` de presencia se actualizan solo por REST (desde la pantalla de perfil): el gateway no los toca al conectar/desconectar.
- El gateway mantiene el estado de las conexiones **en memoria**: con más de una instancia del backend haría falta el adapter de Redis de Socket.IO para que las rooms se compartan entre instancias.
- Los adjuntos persisten en disco del contenedor: con `docker compose` quedan en un volumen; corriendo el contenedor suelto sin volumen, se pierden si se recrea.
- No hay rate limiting ni endpoint para promover/degradar roles — fuera del alcance evaluado.
