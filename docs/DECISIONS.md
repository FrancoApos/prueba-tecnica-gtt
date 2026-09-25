# Decisiones técnicas

Registro de decisiones de arquitectura y su justificación (formato ADR simplificado).

---

## 2026-09-24 — Monorepo con carpetas separadas

**Decisión:** Un único repositorio Git con `backend/`, `mobile/` y `docs/` en la raíz, en vez de dos repos separados.

**Por qué:** La consigna acepta monorepo o carpetas separadas dentro del mismo repo. Un monorepo simplifica compartir contexto (tipos, README único) y facilita la evaluación.

**Alternativas consideradas:** Dos repos independientes — descartado por agregar fricción sin beneficio para el alcance de la prueba.

---

## 2026-09-24 — Chats solo 1 a 1 (no grupales)

**Decisión:** La app soporta únicamente chats entre 2 personas. El schema de `chats` usa `participants: ObjectId[]` (no `userA`/`userB`), que es el modelado idiomático en Mongo y no cierra la puerta a grupos a futuro, pero **no se construye lógica ni UI de chat grupal** en esta entrega.

**Por qué:** la consigna no pide chats grupales. Priorizar cobertura y calidad del flujo obligatorio (30% del puntaje es "funcionamiento e integración") por sobre sumar alcance no pedido que aumenta el riesgo de entregar algo a medio terminar.

**Alternativas consideradas:** modelar `chats` con soporte completo de grupos — descartado por scope creep sin beneficio en la evaluación.

---

## 2026-09-24 — User y Profile en una sola colección

**Decisión:** Los datos de autenticación (email, password hash) y de perfil (nombre, apellido, fecha de nacimiento, teléfono, avatar, estado de conexión) viven en un único documento dentro de la colección `users`.

**Por qué:** separarlos en dos colecciones (`users` + `profiles`) solo agrega un `$lookup`/segunda query para casi cualquier operación (login necesita perfil para mostrar el estado, el listado de usuarios necesita ambos), sin ningún beneficio real a esta escala. Se evalúa coherencia y justificación del modelo, no imitar la normalización de SQL por costumbre.

**Alternativas consideradas:** `users` (credenciales) + `profiles` (referenciado por `userId`) — descartado por complejidad innecesaria.

---

## 2026-09-24 — Persistencia de adjuntos

**Decisión:** Los archivos/imágenes adjuntos a un mensaje se guardan en disco del backend (carpeta `uploads/`, montada como volumen en Docker), y el documento `message` persiste solo la referencia (`url`, `filename`, `mimeType`, `size`), no el binario.

**Por qué:** evita depender de un servicio externo (S3/Cloudinary) que requeriría credenciales — lo cual además contradice el requisito de "repositorio sin secretos". Guardar el binario en base64 dentro del documento de Mongo (alternativa más simple aún) se descartó porque degrada el tamaño/performance de la colección `messages` sin necesidad.

**Alternativas consideradas:** base64 embebido en el documento (simple pero no escala, no es buena práctica ni para una prueba técnica); servicio externo tipo S3 (agrega infraestructura y credenciales fuera de alcance).

**Limitación conocida:** al ser disco local del contenedor, los archivos no persisten si el contenedor se recrea sin volumen — se documentará explícitamente en el README como alcance conocido.

---

## 2026-09-24 — POST /users es el alta de cuenta; sin roles ni admin

**Decisión:** No existe un endpoint `/auth/register` separado ni pantalla de registro en la app móvil (la consigna solo pide login). `POST /users` cumple ese rol. No hay sistema de roles/admin: `PATCH /users/:id` y `DELETE /users/:id` solo permiten que un usuario modifique/borre **su propia** cuenta (se verifica que el `:id` de la ruta coincida con el `id` del JWT).

**Por qué:** evita duplicar la lógica de alta de cuenta en dos endpoints distintos (`/auth/register` y `/users`), y evita construir un sistema de permisos que la consigna no pide. El caso de uso real de la app (cada persona gestiona su propio perfil) no necesita que un usuario edite a otro.

**Alternativas consideradas:** endpoint `/auth/register` dedicado — descartado por redundante; roles admin/user — descartado por fuera de alcance.

---

## 2026-09-25 — Tests reproducibles con `mongodb-memory-server` (sin Docker ni Mongo externo)

**Decisión:** Tanto los tests unitarios (mockeando los modelos de Mongoose) como el test e2e (`test/app.e2e-spec.ts`, que levanta la app HTTP completa) corren contra un MongoDB real en memoria vía `mongodb-memory-server`, no contra un Mongo externo ni con mocks de la base para el e2e.

**Por qué:** `npm run test:e2e` tiene que poder correr en cualquier máquina (o CI) sin que el evaluador tenga que levantar Docker o un Mongo local — cumple mejor el criterio de "facilidad de ejecución" que documentar "primero levantá Mongo, después corré los tests". Al ser un Mongo real (no un mock), el test e2e valida índices únicos, populate, etc. tal como se comportan en producción.

**Nota técnica:** `main.ts` y el test e2e comparten la misma configuración de la app (pipes de validación, filtro de errores, CORS, estáticos) a través de `src/setup-app.ts`, para que el test ejercite el comportamiento real y no una versión simplificada.

**Alternativas consideradas:** mockear la capa de persistencia en el e2e — descartado porque perdería el valor de probar contra una base real; requerir Mongo/Docker corriendo para los tests — descartado por fricción para quien evalúa.
