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

---

## 2026-09-25 — Mobile: Expo + Expo Router (no React Native CLI puro)

**Decisión:** La app usa Expo (managed, no bare) con Expo Router para la navegación (file-based routing en `app/`, con `Stack.Protected` para el gate de login/autenticado).

**Por qué:** Expo Router es la opción recomendada oficialmente para proyectos Expo nuevos (reemplaza a armar la navegación a mano con React Navigation). Expo además permite probar en un dispositivo físico con Expo Go sin necesitar Xcode/Android Studio — clave en un entorno Windows sin Mac. `Stack.Protected` da un patrón limpio y oficial para redirigir a login sin sesión sin tener que escribir esa lógica a mano.

**Alternativas consideradas:** React Native CLI (bare) — descartado por la fricción de compilar nativo en Windows sin necesidad; React Navigation configurado a mano — descartado porque Expo Router ya lo resuelve mejor y es el estándar actual.

---

## 2026-09-25 — Mobile: pantalla "Nuevo chat" no pedida explícitamente por la consigna

**Decisión:** Se agregó `app/(app)/new-chat.tsx`, una pantalla modal que busca usuarios (reutilizando `GET /users`) y abre/crea un chat con el seleccionado (`POST /chats`).

**Por qué:** la consigna solo exige login, listado de chats, conversación y perfil — no un flujo de alta de chat. Pero sin alguna forma de iniciar una conversación nueva, la app solo podría mostrar chats preexistentes (creados por seed/Swagger), lo cual hace que el flujo completo no se pueda demostrar ni probar de punta a punta desde la UI. Es la mínima pieza necesaria para que "listado de chats → conversación" sea un flujo real y usable, no scope creep.

---

## 2026-09-25 — Mobile: sin edición de avatar

**Decisión:** La pantalla de perfil no permite cambiar la foto/avatar.

**Por qué:** el backend solo acepta `avatarUrl` como string (una URL), no upload de archivo, en el endpoint de edición de perfil (`PATCH /users/:id`) — a diferencia de los mensajes, que sí soportan adjuntar un archivo real. Pedirle al usuario que pegue una URL de imagen a mano es mala UX y no aporta a lo que se evalúa; se documenta como alcance no cubierto en vez de forzar una solución pobre.

---

## 2026-09-25 — Mobile: bug de interop conocido en los tests de `sign-in`

**Contexto (no una decisión de diseño, sino una nota técnica):** al testear `sign-in.tsx` con dos escenarios de submit async (éxito y error de credenciales) en el mismo archivo de test, aparecían errores de "overlapping act() calls" de React que rompían el segundo test — pero cada test pasa perfecto en aislamiento (`jest -t "..."`). Se investigó: es una incompatibilidad entre esta combinación exacta de versiones (React 19.2.3, Expo SDK 57, `@testing-library/react-native` 14.0.1, `test-renderer` 1.3.0 — todas muy recientes al momento de esta prueba), no un bug del código de la app.

**Solución aplicada:** se separó el test del caso de error a su propio archivo (`__tests__/sign-in-error.test.tsx`), ya que Jest aísla el registro de módulos (y el estado global de React que causaba el problema) por archivo. Evita el bug sin parches fragiles ni deshabilitar cobertura.

---

## 2026-09-25 — Mobile: repintado desde el design system real de Stitch, tokens verificados vía MCP

**Decisión:** `src/theme/tokens.ts` reemplaza el theme "inventado" original. Los valores (colores, tipografía, spacing, radios, tamaños de componente, sombras) se extrajeron del HTML/CSS real de las pantallas generadas en el proyecto de Stitch "Pulse Chat Design System" (del usuario, generado por él en la web de Stitch) — no de la descripción en prosa del design system, que en varios puntos no coincide con lo efectivamente renderizado (ej. la prosa dice que los botones usan `#4F46E5`; ese valor existe, pero como `primary-container`, no como `primary` — `primary` es en realidad `#3525CD`, reservado para íconos/badges/FAB/tab activo).

**Por qué:** el usuario pidió explícitamente que los tokens salieran del design system real "vía MCP, no de tu criterio", con `TODO` en vez de asumir cuando un valor no está especificado. Se verificaron los valores bajando y leyendo el HTML real de al menos una pantalla de cada módulo con buena evidencia (Chats, Conversación); para Auth/Perfil/Usuarios el campo `htmlCode.downloadUrl` que devuelve el MCP de Stitch para esas pantallas no correspondía a su propio contenido (bug/inconsistencia del lado de Stitch, confirmado comparando), así que esas specs se basan en inspección visual de las capturas (sí verificadas correctas) + los tokens universales, con gaps marcados `TODO` en vez de inventados — ver `docs/design/*/SPEC.md`.

**Alcance explícitamente dejado afuera (decisión del usuario, no mía):**
- **Dark mode**: `palette.dark` existe completo en `tokens.ts`, sin switching real — la consigna no lo pide y cablearlo implica lógica nueva (`useColorScheme()` o `ThemeContext`) en todos los componentes.
- **Fuente Inter**: sí se implementó (`@expo-google-fonts/inter` + `useFonts` con gate en `app/_layout.tsx`, sin tocar pantallas — solo `tokens.ts` cambió sus `fontFamily` a los nombres de peso específicos, ej. `Inter_600SemiBold`, porque son fuentes estáticas y no variables).

**Hallazgo relevante:** el diseño real de Stitch tiene un tab bar de **3 pestañas** (Chats / Users / Profile) y ~10 pantallas para un módulo de "Users" (directorio con búsqueda/filtro/orden/paginado, alta, edición, borrar con confirmación) — confirma la corrección de alcance del usuario: el módulo de usuarios es obligatorio, no un panel admin opcional. **Tensión sin resolver:** ese mock es de estilo administrativo (ver/editar/borrar a otros usuarios), pero el backend actual solo permite editar/borrar la propia cuenta (`docs/DECISIONS.md`, entrada "POST /users es el alta de cuenta; sin roles ni admin"). Queda pendiente decidir el modelo de permisos antes de construir la pantalla — ver `docs/design/05-users/SPEC.md` y `docs/PROGRESS.md`.

**Botón de "nuevo chat" movido a FAB:** el mock de Stitch usa un FAB circular abajo a la derecha para esto, no un ícono de header (que es como se había implementado antes). Se verificó primero que el flujo estuviera completo y funcional (`new-chat.tsx` → `POST /chats` real → navega a la conversación, no un botón muerto) antes de moverlo, según pidió el usuario.
