# Progreso del proyecto

Última actualización: 2026-09-26

## Estado general: 🟢 Backend y mobile funcionales de punta a punta

## Setup
- [x] Monorepo creado (`backend/`, `mobile/`, `docs/`)
- [x] Git inicializado
- [x] Modelado de datos definido (`docs/DATA_MODEL.md`)
- [x] Backend scaffoldeado (NestJS 12, ESM/NodeNext, Vitest, oxlint)
- [x] Conexión a MongoDB (Mongoose)
- [x] Mobile scaffoldeado (Expo + Expo Router + TypeScript)
- [x] Docker (Dockerfile backend + docker-compose con Mongo) — no probado con build real (sin Docker en este entorno de desarrollo)

## Backend
- [x] Estructura de módulos (auth, users, chats, messages, common, config)
- [x] Auth (login, JWT, passport-jwt)
- [x] CRUD usuarios/perfiles (alta pública, resto protegido, self-or-admin edit/delete vía `RolesGuard` + `@Roles('admin')`)
- [x] Listado de usuarios (filtro de texto, paginado, orden) y de chats (paginado por participante, más recientes primero)
- [x] Conversación (mensajes de texto y adjuntos vía multipart, servidos como estáticos)
- [x] Presencia en vivo: el gateway marca `online`/`offline` + `lastSeenAt` según la conexión del socket (contando sesiones por usuario) y emite `presence:changed` a los contactos; el toggle manual del perfil también lo emite
- [x] Tiempo real: gateway de Socket.IO (`src/realtime/`) que empuja `message:new` a los participantes del chat; handshake autenticado con el mismo JWT del REST, socket sin token rechazado. El WS **solo empuja** — escribir sigue siendo el `POST` (ver `docs/DECISIONS.md`)
- [x] Validaciones (DTOs con class-validator, ValidationPipe global whitelist+forbidNonWhitelisted)
- [x] Manejo de errores global (`HttpExceptionFilter`, shape consistente)
- [x] Swagger en `/docs` (con Bearer auth)
- [x] Tests unitarios (25, incluye la presencia del gateway: multi-sesión, offline al cerrar la última, socket sin token) + e2e (flujo completo + control de acceso self-or-admin, con `mongodb-memory-server`, sin depender de Docker/Mongo externo)
- [x] Seed de datos de prueba (`npm run seed`) con credenciales documentadas

## Mobile
- [x] Navegación (login, chats, conversación, perfil) — Expo Router con `Stack.Protected` para el gate de auth
- [x] Integración API centralizada (`src/api/client.ts`, sin URLs/datos hardcodeados en componentes)
- [x] Manejo de estado (Zustand para sesión y chats; hook dedicado para mensajes de una conversación)
- [x] Formularios con validación (react-hook-form + zod) en login y perfil
- [x] Estados de UX: loading, error con retry, empty, y manejo de teclado (KeyboardAvoidingView)
- [x] Diseño UI repintado desde el design system real de Stitch "Pulse Chat" (`docs/design/`) — tokens en `src/theme/tokens.ts` (colores, tipografía Inter, spacing, radios, tamaños, sombras), cero valores sueltos en componentes
- [x] Fuente Inter cargada (`@expo-google-fonts/inter` + `useFonts` con gate en `app/_layout.tsx`)
- [x] Adjuntos: imagen (expo-image-picker) y archivo (expo-document-picker) en la conversación
- [x] Presencia en vivo en la UI: "Activo"/"Inactivo" bajo el nombre en el header de la conversación y el punto del avatar en el listado, actualizados por `presence:changed`
- [x] Tiempo real: cliente de Socket.IO (`src/realtime/socket.ts`) conectado/desconectado por el store de sesión; la conversación agrega los mensajes entrantes (deduplicados por `id`) y el listado de chats actualiza preview + orden aunque estés en otra pantalla
- [x] App corriendo en el browser (`npx expo start --web`) como segundo cliente para probar el chat en vivo desde la PC — tres *platform splits* (`secure-storage`, `alert`, `attachment-form`) porque SecureStore, Alert y el FormData de archivos no existen o no funcionan igual en web. Verificado con `expo export --platform web` (bundle sin errores, usa las variantes web)
- [x] Tests (10): store de sesión (incluye que abra/cierre el canal de tiempo real), utilidades, y formulario de login (éxito/validación/error de credenciales)
- [x] `expo-doctor` 21/21 y bundle de producción (Metro, Android) verificados sin errores
- [x] **Módulo de usuarios** (obligatorio, ver `docs/REQUIREMENTS.md`): tab "Users" — directorio con búsqueda + paginado, tap para iniciar chat con cualquiera, editar/eliminar la cuenta de *otro* usuario solo visible si el rol es `admin` (gate real del lado del servidor, ver `docs/DECISIONS.md` "Roles (self-or-admin)")
- [ ] Probado en dispositivo físico real por el usuario (backend expuesto en LAN, pendiente de confirmación del usuario) — el camino de tiempo real sí está verificado de punta a punta por script (dos sesiones reales contra el backend real, ver Notas)
- [ ] Ordenar el listado de Users (el mock de Stitch tiene un bottom sheet de "Sort by" — no implementado, se usa el orden default del backend)

## Documentación y entrega
- [x] README del backend (instalación, ejecución, env vars, seed/credenciales, arquitectura, rutas, tests)
- [x] README de mobile (instalación, ejecución con Expo Go, credenciales, estructura, decisiones, tests)
- [x] README raíz actualizado (instalación, credenciales, estado)
- [x] `.env.example` (backend y mobile)
- [x] Dockerfile funcional (backend) + docker-compose (backend + Mongo)
- [x] Scripts de test reproducibles (`npm test`, `npm run test:e2e` en backend; `npm run test` en mobile)

## Notas
- Usuario conoce SQL/PostgreSQL, no tiene experiencia previa con MongoDB — las explicaciones de modelado usan analogías con el mundo relacional.
- Docker no está disponible en este entorno de desarrollo — el `Dockerfile`/`docker-compose.yml` no se probaron corriendo un build real, pero el backend sí se validó de punta a punta (Nest build real + Mongo real en memoria + requests HTTP reales via curl y vía el test e2e). Queda como pendiente de verificación manual del build de Docker en una máquina con Docker instalado.
- El usuario tiene un iPhone 16 Pro y planea probar la app mobile ahí vía Expo Go, con el backend corriendo en esta PC y expuesto en la red local (IP de LAN detectada: `192.168.100.6`). Si el celular no logra conectar, el sospechoso número uno es el Firewall de Windows bloqueando conexiones entrantes al puerto 3000.
- **Tiempo real + app web (2026-09-26, desarrollado en una sesión de Claude Code en paralelo al módulo de usuarios):** `backend/src/realtime/` (gateway Socket.IO), `mobile/src/realtime/socket.ts` (cliente) y los tres splits web de mobile (`src/store/secure-storage*.ts`, `src/utils/alert*.ts`, `src/api/attachment-form*.ts`). **Verificado** con un script que levanta Mongo en memoria + el backend real, loguea a `ana` y `bruno`, abre el socket de Bruno y manda un mensaje como Ana por REST: Bruno lo recibe por `message:new` con el mismo `id`/`chatId`/contenido que devolvió el POST, y un socket sin token es rechazado con `auth:error`. También `expo export --platform web` bundlea limpio.
- **Para probar el chat en vivo entre el iPhone y la PC:** `EXPO_PUBLIC_API_URL` tiene que ser la **IP de LAN** (`http://192.168.100.6:3000`) para los *dos* clientes — si la web usa `localhost` y el iPhone la IP, el JWT y el socket funcionan igual, pero es un detalle menos que puede fallar. El backend escucha en `0.0.0.0`, así que el mismo puerto 3000 sirve para HTTP y WS.
