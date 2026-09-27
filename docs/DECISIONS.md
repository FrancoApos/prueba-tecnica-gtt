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

**Seguridad (agregado 2026-09-27):** la app no restringe el tipo de archivo adjunto (la consigna solo pide poder subir imagen o archivo). Sin ninguna medida, un adjunto `.html`/`.svg` con un `<script>` embebido se serviría con su `Content-Type` real desde `/uploads/*` — abierto directo en un browser, ese script correría en el origen de la API (XSS almacenado). Verificado en vivo: subir un `.html` con `<script>alert(...)</script>` y pedirlo devolvía el HTML completo, listo para ejecutarse. Se corrigió sirviendo todo `/uploads/*` con `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` (`setup-app.ts`): el browser siempre lo descarga en vez de renderizarlo. No afecta a las imágenes que la app carga como `<Image>` (subrecurso, no navegación de página — ahí el navegador ignora `Content-Disposition`), verificado también en vivo tras el fix.

---

## 2026-09-24 — POST /users es el alta de cuenta; sin roles ni admin

> **Superseded en parte el 2026-09-26** — ver la entrada "Roles (self-or-admin)..." más abajo: sí se terminó agregando un rol `admin` acotado, por la tensión con el módulo de Users. Se deja esta entrada porque la parte de "no hay `/auth/register` separado" sigue vigente.

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

---

## 2026-09-26 — Roles (self-or-admin), no un login admin separado

**Contexto:** la consigna no menciona admin, roles ni permisos en ningún punto — el único requisito de autenticación es "pantalla de inicio de sesión con correo y contraseña" + "redirección al listado de chats después de un inicio de sesión exitoso" (un solo login). Pero sí exige, sin más detalle, "creación, consulta, actualización y eliminación de usuarios" y "protección de recursos". El mock de Stitch (`docs/design/05-users/`) muestra un directorio estilo admin (ver/editar/borrar a otros), lo que dejaba una tensión real: si cualquier autenticado puede borrar a cualquier otro usuario, es un agujero de seguridad visible en Swagger en dos minutos.

**Decisión:** no se agregó un login/flujo de autenticación separado para administradores — habría contradicho la única línea de la consigna sobre autenticación ("un login, redirige a chats") y es alcance no pedido. En cambio, se resolvió enteramente en el backend, sin tocar pantallas de auth:

- Campo `role: 'user' | 'admin'` en `User` (default `'user'`, **no expuesto en `CreateUserDto`** — el alta pública nunca puede autopromoverse).
- `RolesGuard` + decorador `@Roles(...)` (`src/common/guards/roles.guard.ts`): implementa una regla genérica "dueño o rol" sobre rutas `/recurso/:id` — si el `:id` coincide con el usuario autenticado, se permite siempre (cada quien gestiona lo suyo); si no coincide, exige que su rol esté en `@Roles(...)`.
- Aplicado como `@Roles('admin')` en `PATCH /users/:id` y `DELETE /users/:id`: cualquiera edita/borra lo propio: editar o borrar la cuenta de **otro** requiere `admin`.
- Seed con 3 usuarios: `ana`/`bruno` (`user`) + `admin@example.com` (`admin`, promovido directo sobre el documento en el seed — no hay endpoint para promover a nadie, es la única forma de tener un admin en esta app).

**Por qué esta forma y no otra:** mantiene un único flujo de login (cumple la consigna literal), es ~40 líneas de NestJS bien acotadas, y el criterio "Backend" (25% de la nota) lista explícitamente autenticación/validaciones — un guard de autorización correcto demuestra ese criterio sin inflar el alcance con una pantalla/seed/flujo de admin aparte.

**Mobile:** la pantalla de Users (`app/(app)/(tabs)/users.tsx`, `app/(app)/edit-user.tsx`) se muestra siempre — es el directorio para iniciar chats con cualquiera. Los botones de editar/eliminar en la fila de **otro** usuario se ocultan si `user.role !== 'admin'`; la autorización real sigue siendo del lado del servidor (RolesGuard), esto es solo para no ofrecer una acción que el backend va a rechazar igual.

**Alternativas descartadas:** login/sesión de admin separada (contradice "un login, redirige a chats"); dejar el directorio de solo lectura sin rol alguno (no cumpliría "actualización y eliminación de usuarios" tal como lo interpretó el mock de Stitch, que sí es parte de la consigna).

---

## 2026-09-26 — Tiempo real por WebSocket (push sobre REST, no un segundo camino de escritura)

**Contexto:** la consigna pide "actualización inmediata de la interfaz al enviar" (que ya se cumplía con el update local al responder el POST), pero no dice nada de recibir en vivo lo que manda el otro. Sin eso, la app solo muestra los mensajes nuevos al re-entrar a la conversación: alcanza para la consigna, pero es imposible *demostrar* un chat con dos clientes al mismo tiempo, que es exactamente cómo se prueba una app de chat.

**Decisión:** se agregó un gateway de Socket.IO (`src/realtime/realtime.gateway.ts`) que **solo empuja**. El REST sigue siendo el único camino de escritura: el mensaje se persiste en `POST /chats/:chatId/messages` y recién después el service llama a `emitMessageCreated(...)` con el mismo DTO que devuelve HTTP. No hay un evento de "enviar mensaje" por WS.

**Por qué:** un segundo camino de escritura duplicaría validación, autorización y manejo de errores (y sería un agujero fácil de dejar abierto). Así el WS es una mejora de UX sobre una API que ya estaba completa y testeada, y si el socket se cae la app sigue funcionando entera con un reload de la pantalla.

**Autenticación:** el handshake del socket valida el **mismo JWT** del REST (`handshake.auth.token`, con fallback al header `Authorization`); si falta o es inválido se emite `auth:error` y se desconecta. Cada cliente autenticado queda en una room `user:<id>`, y un mensaje nuevo se emite a la room de **cada participante del chat, incluido el remitente** (sus otras sesiones — otro dispositivo, o la app web abierta en paralelo — también lo necesitan). El cliente deduplica por `id`, así que recibir de vuelta el propio mensaje no duplica la burbuja.

**Alternativas descartadas:** *polling* cada pocos segundos (más simple, pero latencia visible y requests constantes contra un endpoint paginado); SSE (unidireccional alcanzaría, pero Socket.IO ya trae reconexión y rooms, que es justo el ruteo que hacía falta).

**Alcance dejado afuera (en su momento):** indicador de "escribiendo…" y recibos de lectura — nada de eso lo pide la consigna. La presencia en vivo sí se implementó después: ver la entrada del 2026-09-27 más abajo.

## 2026-09-26 — App web (react-native-web) como segundo cliente para probar en la PC

**Contexto:** para probar un chat en vivo hacen falta **dos** clientes. El entorno de desarrollo es Windows, donde no existe el simulador de iOS (es solo macOS): el iPhone va con Expo Go, pero la PC necesitaba algo.

**Decisión:** se habilitó el target web de Expo (`react-dom`, `react-native-web`, `@expo/metro-runtime`) para usar el browser como segundo cliente. **No es un entregable**: la entrega sigue siendo la app nativa; la web es la herramienta para poder demostrar el flujo de a dos. Se resolvió con tres *platform splits* (Metro resuelve el sufijo `.web` automáticamente), en vez de meter `Platform.OS === 'web'` en las pantallas:

- `src/store/secure-storage.ts` / `.web.ts` — `expo-secure-store` **no tiene implementación web** (su módulo nativo en web es literalmente `export default {}`, así que la sesión rompía al hidratar). En web se usa `localStorage`, que no es almacenamiento seguro: aceptable porque el browser acá es solo herramienta de prueba, no el target de entrega.
- `src/utils/alert.ts` / `.web.ts` — el `Alert` de react-native-web es un no-op (`static alert() {}`), así que el menú de "Adjuntar" quedaba muerto en el browser. En web degrada a confirmaciones en cadena.
- `src/api/attachment-form.ts` / `.web.ts` — el FormData de React Native acepta el shape `{ uri, name, type }`; el del browser necesita un `Blob`/`File` real, que se obtiene leyendo la URI `blob:` del picker.

**Por qué el split y no un `if`:** los tres casos son "esta plataforma no tiene esta capacidad", no una variación de comportamiento — el split deja el código de las pantallas sin ramas de plataforma y hace que el bundle nativo no cargue nada de web (verificado: en el bundle web no aparece `getItemAsync`).

**Verificación:** `npx expo export --platform web` bundlea sin errores y el bundle usa las variantes web (`localStorage`, `confirm`), no las nativas.

## 2026-09-27 — Presencia en vivo derivada de la conexión del socket

**Contexto:** el header de la conversación muestra "Activo"/"Inactivo" del contacto, pero ese dato venía del listado de chats: se refrescaba solo al recargar, así que podía decir "Activo" con la otra persona hacía rato afuera. La consigna pide "estado de conexión" y "última conexión" como campos del perfil, sin definir quién los escribe.

**Decisión:** el gateway deriva la presencia de la conexión real del socket. Al conectar marca `online`, al desconectar `offline` + `lastSeenAt`, persiste en Mongo y emite `presence:changed` a los contactos.

**Conteo por usuario, no por socket:** una misma persona puede tener varias sesiones abiertas (el celular y la web en paralelo, que es justo el escenario de prueba). El gateway guarda un `Map<userId, Set<socketId>>` y solo cambia el estado en las transiciones 0→1 y 1→0; cerrar una de dos pestañas no la muestra desconectada.

**Solo a los contactos:** `presence:changed` se emite a las rooms de los usuarios con los que tenés un chat (`ChatsService.listContactIds`), no en broadcast. Quien no habló nunca con vos no recibe tus entradas y salidas.

**Convivencia con el toggle manual del perfil** (que la consigna sí pide): los dos caminos escriben el mismo campo y **gana el último**. Un cambio manual se mantiene hasta la próxima transición de conexión (si te ponés "desconectado" a mano y más tarde reabrís la app, volvés a "en línea"). El `PATCH /users/:id` también emite `presence:changed`, así que el toggle se ve en vivo del otro lado igual que la presencia automática — si no, el switch del perfil sería la única parte de la app que exige recargar. No se implementó un "aparecer desconectado" persistente (override manual que el socket no pueda pisar): es alcance que la consigna no pide.

**Dónde vive:** `PresenceService` está en el módulo de realtime y toma el modelo de `User` directo de Mongoose, en vez de depender de `UsersModule`. Así `UsersModule` puede importar `RealtimeModule` para emitir el cambio manual sin armar un ciclo de módulos.

**Alcance dejado afuera:** indicador de "escribiendo…", recibos de lectura, y presencia con más de una instancia del backend (el `Map` es en memoria — con varias instancias haría falta el adapter de Redis, igual que las rooms).

**Verificado** con un script contra el backend real: Bruno observa y recibe `online` cuando Ana conecta; cerrar **una** de las dos sesiones de Ana **no** dispara `offline`; cerrar la última sí, y queda persistido con `lastSeenAt`; y el `PATCH` manual del perfil también le llega en vivo.
