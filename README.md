# Prueba Técnica Full Stack — Chat App (React Native + NestJS)

Monorepo para la prueba técnica: aplicación móvil de chat con backend en **NestJS + MongoDB** y frontend en **React Native + TypeScript**.

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

Escaneá el QR con Expo Go (iOS/Android) o abrí un emulador/simulador. Detalle completo en [`mobile/README.md`](mobile/README.md).

## Credenciales de prueba

Después de correr `npm run seed` en `backend/` (ver [`backend/README.md`](backend/README.md#datos-de-prueba-seed)):

| Email | Password | Rol |
|---|---|---|
| `ana@example.com` | `Sup3rSecret!` | `user` |
| `bruno@example.com` | `Sup3rSecret!` | `user` |
| `admin@example.com` | `Sup3rSecret!` | `admin` |

## Estado del proyecto

Ver [`docs/PROGRESS.md`](docs/PROGRESS.md) para el detalle. En resumen: **backend y mobile funcionales de punta a punta** — login, listado de chats, conversación (texto + adjuntos) y perfil, contra la API real. Pendiente de verificación en un dispositivo físico por el usuario y de probar el build de Docker (sin Docker disponible en el entorno de desarrollo).
