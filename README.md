# Prueba Técnica Full Stack — Chat App (React Native + NestJS)

Monorepo para la prueba técnica: aplicación móvil de chat con backend en **NestJS + MongoDB** y frontend en **React Native + TypeScript**.

## Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | NestJS, TypeScript, MongoDB (Mongoose), JWT (`passport-jwt`), class-validator, Swagger, Multer, Socket.IO |
| Mobile | React Native (Expo, Expo Router), TypeScript, Zustand, react-hook-form + zod, Socket.IO client |
| Tests | Vitest + `mongodb-memory-server` (backend), Jest + React Native Testing Library (mobile) |
| Infra | Docker Compose (Mongo + backend, con seed automático) |

## Decisiones técnicas clave

Detalle completo, con alternativas descartadas, en [`docs/DECISIONS.md`](docs/DECISIONS.md). Las tres que más pesan:

- **MongoDB** — impuesto por la consigna, no elegido, pero el modelo se pensó para aprovechar que es documental en vez de tratarlo como una tabla SQL disfrazada: `Chat.lastMessage` guarda una copia denormalizada del último mensaje (evita joinear `messages` solo para listar chats), `Message.attachment` es un subdocumento embebido (no una colección aparte para algo que siempre vive con su mensaje), y `participantsKey` (`[idMenor, idMayor].join('_')` + índice único) reemplaza el `UNIQUE(par)` que Mongo no tiene nativamente.
- **Zustand** — la consigna dejaba elegir (Redux/Zustand/Context). Con un dominio chico, dos stores globales alcanzan: `sessionStore` (usuario + auth) y `chatsStore` (listado + último mensaje) — lo que sí es compartido entre pantallas. Los mensajes de una conversación y el listado paginado de Users **no** son estado global: viven en un hook/`useState` local a su pantalla, porque ninguna otra pantalla los necesita — meterlos en un store obligaría a keyear por chat o a invalidar caché sin ningún beneficio real acá.
- **Socket.IO** — no lo pedía la consigna, se agregó para poder demostrar un chat en vivo entre dos clientes (condición real de cómo se prueba una app de chat). Es estrictamente un *push* sobre REST: el mensaje se persiste por `POST /chats/:chatId/messages` como siempre, y recién después el gateway lo empuja a los participantes — no hay un segundo camino de escritura que valide/autorice por separado.

## Estructura del repositorio

```
.
├── backend/       API REST en NestJS + MongoDB
├── mobile/        App en React Native + TypeScript
└── docs/          Documentación de avance, decisiones y modelado
```

## Documentación de seguimiento

- [`docs/PROGRESS.md`](docs/PROGRESS.md) — checklist de avance por área
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — decisiones técnicas y su justificación
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — modelado de datos (colecciones MongoDB)
- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — consigna original resumida

## Instalación y ejecución

### Backend

```bash
cd backend
npm install
cp .env.example .env   # ajustar MONGODB_URI si hace falta
npm run start:dev
```

O con Docker (backend + Mongo juntos, desde la raíz):

```bash
docker compose up --build
```

Detalle completo (variables de entorno, seed de datos, tests, rutas) en [`backend/README.md`](backend/README.md).

### Mobile

```bash
cd mobile
npm install
cp .env.example .env   # ajustar EXPO_PUBLIC_API_URL — ver comentarios en el archivo
npx expo start
```

Escaneá el QR con Expo Go (iOS/Android) o abrí un emulador/simulador. Para abrir la app en el browser de la PC (útil para probar un chat en vivo entre dos clientes): `npx expo start --web`. Detalle completo en [`mobile/README.md`](mobile/README.md).

## Credenciales de prueba

Después de correr `npm run seed` en `backend/` (ver [`backend/README.md`](backend/README.md#datos-de-prueba-seed)):

| Email | Password | Rol |
|---|---|---|
| `ana@example.com` | `Sup3rSecret!` | `user` |
| `bruno@example.com` | `Sup3rSecret!` | `user` |
| `admin@example.com` | `Sup3rSecret!` | `admin` |

## Estado del proyecto

Ver [`docs/PROGRESS.md`](docs/PROGRESS.md) para el detalle. En resumen: **backend y mobile funcionales de punta a punta** — login, listado de chats, directorio de usuarios, conversación (texto + adjuntos, con mensajes en **tiempo real** vía WebSocket) y perfil, contra la API real. Pendiente de verificación en un dispositivo físico por el usuario y de probar el build de Docker (sin Docker disponible en el entorno de desarrollo).
