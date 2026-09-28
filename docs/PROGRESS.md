# Progreso del proyecto

Última actualización: 2026-09-28

## Estado general: 🟢 Backend y mobile funcionales de punta a punta

## Setup
- [x] Monorepo creado (`backend/`, `mobile/`, `docs/`)
- [x] Git inicializado
- [x] Modelado de datos definido (`docs/DATA_MODEL.md`)
- [x] Backend scaffoldeado (NestJS 12, ESM/NodeNext, Vitest, oxlint)
- [x] Conexión a MongoDB (Mongoose)
- [x] Mobile scaffoldeado (Expo + Expo Router + TypeScript)
- [x] Docker (Dockerfile backend + docker-compose con Mongo) — **construido y probado de verdad el 2026-09-28**: `docker compose up --build` deja la API con datos de prueba en un comando, contenedor `healthy`, proceso corriendo como usuario `node` (no root), Mongo atado a loopback (no a la LAN) y seed idempotente, verificado que una cuenta con foto creada desde la app sobrevive a un reinicio del contenedor

## Backend
- [x] Estructura de módulos (auth, users, chats, messages, common, config)
- [x] Auth (login, JWT, passport-jwt)
- [x] CRUD usuarios/perfiles (alta pública, resto protegido, self-or-admin edit/delete vía `RolesGuard` + `@Roles('admin')`)
- [x] Listado de usuarios (filtro de texto, paginado y ordenamiento — los tres los pide la consigna) y de chats (todos los del participante, ordenados por actividad más reciente; la consigna no pide paginarlos ni ordenarlos, el orden es un agregado)
- [x] Conversación (mensajes de texto y adjuntos vía multipart, servidos por `AttachmentsController` con el nombre original en el `Content-Disposition`, ver `docs/DECISIONS.md`)
- [x] Presencia en vivo: el gateway marca `online`/`offline` + `lastSeenAt` según la conexión del socket (contando sesiones por usuario) y emite `presence:changed` a los contactos; el toggle manual del perfil también lo emite
- [x] Tiempo real: gateway de Socket.IO (`src/realtime/`) que empuja `message:new` a los participantes del chat; handshake autenticado con el mismo JWT del REST, socket sin token rechazado. El WS **solo empuja** — escribir sigue siendo el `POST` (ver `docs/DECISIONS.md`)
- [x] Validaciones (DTOs con class-validator, ValidationPipe global whitelist+forbidNonWhitelisted)
- [x] Manejo de errores global (`HttpExceptionFilter`, shape consistente)
- [x] Swagger en `/docs` (con Bearer auth)
- [x] Tests unitarios (36, incluye los seis de la foto de perfil —reemplazo que borra el archivo anterior, borrado al eliminar la cuenta, y que el nombre en disco salga de lo guardado y no del segmento pedido, o sea sin path traversal—, la presencia del gateway —multi-sesión, offline al cerrar la última, socket sin token— y el orden del listado de usuarios) + e2e (4: health, flujo completo + control de acceso self-or-admin, subida/descarga de un adjunto verificando que conserve su nombre original, y el ciclo entero de la foto de perfil —subir, servir inline, rechazar un SVG con 415, reemplazar borrando la anterior, quitar, y que otro usuario no pueda tocarla—; más 4 del seed en `test/seed.e2e-spec.ts` —que siembre en base vacía, que sea no-op sobre base poblada, que no borre lo creado desde la app, y el `--force`—; con `mongodb-memory-server`, sin depender de Docker/Mongo externo)
- [x] Seed de datos de prueba (`npm run seed`) con credenciales documentadas — **idempotente**: busca cada entidad por su clave natural (email, `participantsKey`, chat+remitente+contenido) y solo crea lo que falta, así que el re-seed de cada arranque del contenedor no se lleva puesto lo creado desde la app. `npm run seed:reset` (`--force`) vacía base y uploads para volver al estado limpio

## Mobile
- [x] Navegación (login, chats, conversación, perfil) — Expo Router con `Stack.Protected` para el gate de auth
- [x] Integración API centralizada (`src/api/client.ts`, sin URLs/datos hardcodeados en componentes)
- [x] Manejo de estado (Zustand para sesión y chats; hook dedicado para mensajes de una conversación)
- [x] Formularios con validación (react-hook-form + zod) en login y perfil
- [x] Estados de UX: loading, error con retry, empty, y manejo de teclado (KeyboardAvoidingView en los formularios; en la conversación, `useKeyboardHeight` — ver docs/DECISIONS.md)
- [x] Diseño UI repintado desde el design system real de Stitch "Pulse Chat" (`docs/design/`) — tokens en `src/theme/tokens.ts` (colores, tipografía Inter, spacing, radios, tamaños, sombras), cero valores sueltos en componentes
- [x] Fuente Inter cargada (`@expo-google-fonts/inter` + `useFonts` con gate en `app/_layout.tsx`)
- [x] Adjuntos: imagen (expo-image-picker) y archivo (expo-document-picker) en la conversación
- [x] Presencia en vivo en la UI: "Activo"/"Inactivo" bajo el nombre en el header de la conversación y el punto del avatar en el listado, actualizados por `presence:changed`
- [x] Tiempo real: cliente de Socket.IO (`src/realtime/socket.ts`) conectado/desconectado por el store de sesión; la conversación agrega los mensajes entrantes (deduplicados por `id`) y el listado de chats actualiza preview + orden aunque estés en otra pantalla
- [x] App corriendo en el browser (`npx expo start --web`) como segundo cliente para probar el chat en vivo desde la PC — tres *platform splits* (`secure-storage`, `alert`, `attachment-form`) porque SecureStore, Alert y el FormData de archivos no existen o no funcionan igual en web. Verificado con `expo export --platform web` (bundle sin errores, usa las variantes web)
- [x] Tests (34, 8 suites): foto de perfil (se sube al elegirla sin pasar por "Guardar cambios", no se sube nada si se deniega el permiso, y "Quitar foto" aparece solo si hay una), store de sesión (incluye que abra/cierre el canal de tiempo real), utilidades (formato de timestamps y conversión de fechas DD-MM-YYYY ↔ ISO), formulario de login (éxito/validación/error de credenciales) y la hoja de ordenamiento de Users (selección en borrador hasta aplicar, y el mapeo de cada opción al par `sortBy`/`sortOrder` del backend)
- [x] `expo-doctor` 21/21 y bundle de producción (Metro, Android) verificados sin errores
- [x] **Módulo de usuarios** (obligatorio, ver `docs/REQUIREMENTS.md`): tab "Users" — directorio con búsqueda + paginado, tap para iniciar chat con cualquiera, editar/eliminar la cuenta de *otro* usuario solo visible si el rol es `admin` (gate real del lado del servidor, ver `docs/DECISIONS.md` "Roles (self-or-admin)")
- [x] Probado en un iPhone físico contra el backend en la LAN (2026-09-27): login, conversación en vivo y envío de adjuntos (.docx, .pdf, imagen). Salieron dos bugs de ahí, los dos arreglados y documentados en `docs/DECISIONS.md`:
  - `Cannot assign to property 'name' which has only a getter` al mandar cualquier adjunto — choque entre el `FormData` parcheado de Expo y el `File` de React Native
  - el archivo se descargaba con el UUID del disco en vez de su nombre original, y con los acentos y espacios percent-encodeados
- [x] Ordenar el listado de Users — bottom sheet "Ordenar por" (`src/components/UsersSortSheet.tsx`) con las cuatro opciones del mock: Nombre A–Z / Z–A, Actividad reciente y Más recientes primero. Completa el "paginado y ordenamiento" que pide la consigna para el listado de usuarios
- [x] **Subida de imagen para la foto de perfil** (hecho el 2026-09-28, según el plan acordado el 2026-09-27). El campo de texto con la URL ya no existe: se elige la foto de la galería y se sube como archivo
  - Backend: `POST /users/:id/avatar` (multipart) y `DELETE /users/:id/avatar`, protegidos con el mismo `RolesGuard` + `@Roles('admin')` que `PATCH`/`DELETE /users/:id` (self-or-admin, sin código nuevo); storage propio en `uploads/avatars/` con allowlist png/jpeg/webp **y sin svg**; se borra el archivo anterior al reemplazar, al quitar la foto, al eliminar la cuenta y al re-seedear
  - Ruta de servido propia (`GET /uploads/avatars/:storedName`, `AvatarsController`), porque la de adjuntos resuelve el archivo buscando el *mensaje* que lo referencia y un avatar no tiene mensaje
  - `avatarUrl` dejó de ser escribible por el cliente (fuera de `CreateUserDto` y `UpdateUserDto`): lo arma el servidor
  - Mobile: picker (`expo-image-picker`) con "Cambiar foto" / "Quitar foto", reusando `appendAttachment`; la foto se sube al elegirla, no al tocar "Guardar cambios"
  - Ver la entrada del 2026-09-28 en `docs/DECISIONS.md` (revierte la del 2026-09-25 y supera la del 2026-09-27)

## Documentación y entrega
- [x] README del backend (instalación, ejecución, env vars, seed/credenciales, arquitectura, rutas, tests)
- [x] README de mobile (instalación, ejecución con Expo Go, credenciales, estructura, decisiones, tests)
- [x] README raíz actualizado (instalación, credenciales, estado)
- [x] `.env.example` (backend y mobile)
- [x] Dockerfile funcional (backend) + docker-compose (backend + Mongo) — **build y arranque verificados** el 2026-09-28
- [x] Scripts de test reproducibles (`npm test`, `npm run test:e2e` en backend; `npm run test` en mobile)

## Notas
- Usuario conoce SQL/PostgreSQL, no tiene experiencia previa con MongoDB — las explicaciones de modelado usan analogías con el mundo relacional.
- Docker **sí** está disponible y el stack se verificó corriendo (2026-09-28): `/health`, login, subida/servido/borrado de la foto de perfil (bytes idénticos a los subidos), rechazo 415 de un SVG, y subida/descarga de un adjunto de mensaje — todo contra el contenedor, no contra el backend local. Ver la entrada del 2026-09-28 en `docs/DECISIONS.md`.
- El usuario tiene un iPhone 16 Pro y planea probar la app mobile ahí vía Expo Go, con el backend corriendo en esta PC y expuesto en la red local (IP de LAN detectada: `192.168.100.6`). Si el celular no logra conectar, el sospechoso número uno es el Firewall de Windows bloqueando conexiones entrantes al puerto 3000.
- **Tiempo real + app web (2026-09-26, desarrollado en una sesión de Claude Code en paralelo al módulo de usuarios):** `backend/src/realtime/` (gateway Socket.IO), `mobile/src/realtime/socket.ts` (cliente) y los tres splits web de mobile (`src/store/secure-storage*.ts`, `src/utils/alert*.ts`, `src/api/attachment-form*.ts`). **Verificado** con un script que levanta Mongo en memoria + el backend real, loguea a `ana` y `bruno`, abre el socket de Bruno y manda un mensaje como Ana por REST: Bruno lo recibe por `message:new` con el mismo `id`/`chatId`/contenido que devolvió el POST, y un socket sin token es rechazado con `auth:error`. También `expo export --platform web` bundlea limpio.
- **Para probar el chat en vivo entre el iPhone y la PC:** `EXPO_PUBLIC_API_URL` tiene que ser la **IP de LAN** (`http://192.168.100.6:3000`) para los *dos* clientes — si la web usa `localhost` y el iPhone la IP, el JWT y el socket funcionan igual, pero es un detalle menos que puede fallar. El backend escucha en `0.0.0.0`, así que el mismo puerto 3000 sirve para HTTP y WS.
