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

**Mobile:** la pantalla de Users (`app/(app)/(tabs)/users.tsx`, `app/(app)/edit-user.tsx`) se muestra siempre — es el directorio para iniciar chats con cualquiera. Las tres acciones de administración se muestran solo con rol `admin`: editar y eliminar en la fila de **otro** usuario, y el botón de alta en el header (actualizado el 2026-09-27; antes el alta estaba visible para cualquier autenticado).

Para editar y eliminar, la autorización real es del servidor (`RolesGuard`) y ocultar los botones solo evita ofrecer una acción que el backend va a rechazar igual. **El alta no tiene equivalente en el servidor**: `POST /users` es público a propósito, porque es el mismo endpoint de alta de cuenta que usan el seed y Swagger, así que esconder el botón es coherencia de UI y no una barrera. Como la app no tiene pantalla de registro para alguien deslogueado, esto deja al admin como el único camino para crear un usuario **desde la app** — el endpoint público sigue disponible para el seed, Swagger o un cliente futuro.

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

## 2026-09-27 — El teclado de la conversación no usa `KeyboardAvoidingView`

**Contexto:** en el iPhone el teclado tapaba la barra de escribir de la conversación: quedaba visible apenas la mitad superior del input.

**Causa:** `KeyboardAvoidingView` mide su propio frame con `onLayout`, o sea **relativo al padre**. En una pantalla con header nativo la `y` le da 0 aunque en pantalla arranque debajo del header, así que el padding que calcula queda corto exactamente en el alto del header. Esa diferencia se compensa a mano con `keyboardVerticalOffset`, que estaba fijo en `90` — menos que el header real de la conversación, que es custom (avatar + nombre + estado) y encima varía con el notch de cada equipo. Cualquier constante ahí acierta en un teléfono y falla en el siguiente.

**Decisión:** la pantalla de conversación deja de usar `KeyboardAvoidingView` y toma el hueco del **alto del teclado** que reporta el propio evento (`src/hooks/useKeyboardHeight.ts`), que ya viene medido contra la pantalla y por lo tanto no depende de nada de lo que haya arriba. Como la barra vive pegada al borde inferior, alcanza con `paddingBottom` de ese alto. El hook escucha `keyboardWillShow`/`keyboardWillHide` y replica duración y curva con `LayoutAnimation`, para que la barra suba junto con el teclado y no después.

**Solo iOS:** en Android el sistema ya redimensiona la ventana (`adjustResize`) y sumar padding lo duplicaría. El hook devuelve 0 fuera de iOS.

**De paso:** con el teclado cerrado la barra ahora respeta el área del home indicator (`insets.bottom`); con el teclado abierto no hace falta porque la cubre el teclado. Y al abrirse el teclado la lista hace `scrollToEnd`: como el área visible se achica, si no los últimos mensajes quedaban tapados.

**No se tocaron** los formularios (perfil, editar/nuevo usuario), que siguen con `KeyboardAvoidingView` y `offset` 0: son pantallas con scroll donde el faltante del header no llega a esconder el campo enfocado.

## 2026-09-27 — La fecha de nacimiento se muestra y se tipea en DD-MM-YYYY

**Contexto:** los tres formularios con fecha de nacimiento (alta de usuario, edición de usuario y perfil propio) pedían el dato en `AAAA-MM-DD`, que es el formato del contrato HTTP y no el que se usa acá para escribir una fecha.

**Decisión:** el cambio es solo de presentación. La API sigue hablando ISO 8601 (el backend valida con `@IsDateString` y Mongo guarda un `Date`); la conversión vive en `mobile/src/utils/date.ts` y se aplica en los bordes: `toDisplayDate` al cargar el formulario y `toApiDate` al enviarlo. No se tocó ni el backend ni el seed.

**El formato se corta del string ISO, no se pasa por `new Date`:** la fecha se guarda a medianoche UTC, así que interpretarla en hora local la correría un día para todo el que esté al oeste de Greenwich — en Argentina (UTC-3) todas las fechas se verían un día antes.

**Validación:** el mismo archivo exporta `birthDateField`, el campo de zod compartido por las tres pantallas, así que el formato y su mensaje no se duplican. Además de la forma valida que la fecha exista: `31-02-1995` se rechaza con "Esa fecha no existe", que antes pasaba el regex y moría en el backend.

**Sigue afuera:** el date picker nativo que sugiere el diseño (ver `docs/design/04-profile/SPEC.md`) — no hay `@react-native-community/datetimepicker` instalado y el input de texto alcanza.

## 2026-09-27 — Adjuntos en nativo: se manda un `Blob` con nombre, no un `File`

**Contexto:** mandar un `.docx` desde el iPhone fallaba con `Cannot assign to property 'name' which has only a getter`. El adjunto nunca salía.

**Causa:** dos polyfills que no se hablan. Expo parchea `FormData.prototype.append` (`expo/src/winter/FormData.ts`, `normalizeArgs`) y, si la parte es un `Blob` que no tiene `name` **propio**, le asigna uno. En el `File` de React Native (`Libraries/Blob/File.js`) `name` es un getter del **prototipo**, así que no hay descriptor propio: Expo entra por esa rama, la asignación sube por la cadena de prototipos, encuentra el accessor sin setter y Hermes tira `TypeError`.

**Decisión:** `mobile/src/api/attachment-form.ts` manda un `Blob` pelado — cuyo prototipo no define `name`, así que la asignación de Expo crea una propiedad propia sin problema — re-envuelto con el `mimeType` del picker, porque el tipo que sale de `fetch('file://…')` no es confiable. El nombre se pone de las **dos** formas que leen los serializadores: como propiedad propia (lo que mira `getParts()` de RN) y como tercer argumento de `append()` (lo estándar, y lo que usa el parche de Expo). Así no depende de cuál de los dos caminos esté activo.

**Por qué no el shorthand de RN** (`append('file', { uri, name, type })`): Expo también reemplaza el `fetch` global por `expo/fetch`, que serializa el multipart en JS (`expo/src/winter/fetch/convertFormData.ts`) y solo entiende partes `string`, `Blob` o algo con `.bytes()`. Un `{ uri }` no es ninguna de las tres y muere con "Unsupported FormDataPart implementation".

**La variante web no cambió:** en el browser `File` y `FormData` son los nativos y Expo no los parchea (`installFormDataPatch` solo se llama en `runtime.native.ts`).

## 2026-09-27 — Los adjuntos los sirve un controller, no `useStaticAssets`

**Contexto:** el archivo se bajaba con el nombre del disco (`46a2965d-….docx`) en vez del original.

**Causa:** los adjuntos se guardan con un UUID como nombre (para no colisionar ni depender de lo que el usuario haya llamado al archivo), y el servidor de estáticos solo conoce ese nombre. El `Content-Disposition: attachment` salía **sin** `filename`, así que el browser caía al último segmento de la URL. El nombre original sí estaba guardado, pero en la base (`attachment.filename`), que el estático no consulta.

**Decisión:** `AttachmentsController` (`GET /uploads/:storedName`) reemplaza a `useStaticAssets`. Busca el mensaje por su `attachment.url`, y sirve el archivo con `res.download(path, attachment.filename)`, que arma el `Content-Disposition` correcto (express agrega el `filename*=UTF-8''…` de RFC 6266 cuando el nombre se sale de latin1). La URL pública no cambió, así que el cliente no se tocó.

**Se mantienen las dos protecciones que tenía el estático:** `attachment` (un .html/.svg subido como adjunto se baja en vez de renderizarse en el origen de la API, que sería XSS almacenado) y `nosniff`. El `Content-Type` ahora sale de lo que guardó la base, no de la extensión del archivo en disco.

**El path nunca se arma con el segmento crudo de la URL:** se usa el `basename` de la URL que guardó el propio servidor (un UUID generado acá), recién después de que la consulta a la base encontró el mensaje. Un `..%2f..` en la request no llega a tocar el filesystem.

**Sigue público, sin `JwtAuthGuard`,** igual que el estático que reemplaza: las imágenes se cargan con `<Image>`, que no puede mandar el header `Authorization`. Lo único que protege un adjunto es que la URL lleva un UUID aleatorio. Queda anotado como límite conocido.

**De paso — el nombre llegaba percent-encodeado:** `expo/fetch` pasa el filename por `encodeURIComponent` antes de ponerlo en el header (`encodeFilename`), así que "Informe final.docx" llegaba como "Informe%20final.docx". `decodeAttachmentName` en `messages.service.ts` lo decodifica, con fallback al valor crudo si no es una secuencia válida (un archivo llamado "50%.pdf" subido desde la web, por ejemplo). Como `encodeURIComponent` también encodea el no-ASCII, esto además arregla los acentos: sin decodificar, multer lee el header en latin1 y una "ñ" salía como "Ã±".

## 2026-09-27 — La pantalla de Sign In se alineó con la captura de Stitch

**Contexto:** la pantalla funcionaba pero se veía pobre al lado del resto de la app: título pegado a la izquierda, sin marca arriba, campos sin los íconos del diseño y un banner de error que era un rectángulo de texto.

**Decisión:** en vez de inventar un estilo nuevo, se implementó lo que ya estaba documentado y sin hacer en `docs/design/01-auth/SPEC.md` (capturas de Stitch bajadas por MCP): marca centrada arriba, título y subtítulo centrados, íconos de sobre y candado adentro de los campos, flecha en el botón primario y banner de error con ícono y botón de cerrar. Lo que el mock tiene y la consigna no pide sigue afuera: "Forgot password?" (no hay flujo de recuperación) y "Sign up" (no hay registro).

**La marca es un ícono, no un asset:** `assets/icon.png` es todavía el ícono por defecto del template de Expo (una "A" azul ajena a la paleta). Se dibuja un cuadrado redondeado con `colors.primaryContainer` y una burbuja de chat encima, así la pantalla queda consistente con los tokens en vez de depender de un logo que el proyecto no tiene.

**Dos tokens nuevos**, `typography.titleAuth` y `sizes.authLogo`, marcados en `tokens.ts` como medidos sobre la captura y no sobre HTML — para este módulo el MCP de Stitch devuelve markup de otra pantalla (ver la nota de método del SPEC), así que es lo más firme que hay.

**Alcance:** `FormTextInput` ganó un `icon` opcional y el ícono de error a la derecha, así que el detalle de error del diseño (borde rojo + "x" + alerta debajo) aplica también a los formularios de perfil y de usuarios, que comparten el componente. Los íconos por campo, en cambio, se usan solo en Sign In: son los dos que la captura define.

**Un test cambió:** `sign-in-error.test.tsx` afirmaba el mensaje con `toHaveTextContent` sobre el contenedor del banner; ahora el banner tiene íconos, que son glifos de fuente y entran en ese texto concatenado. Pasa a buscar el texto del mensaje, que es lo que el test quería verificar.

## 2026-09-27 — Manejo de sesión: JWT stateless, sin refresh token

**Contexto:** la consigna pide, textualmente, "mecanismo de autenticación y manejo de sesión", sin definir cuál. Estaba implementado pero nunca documentado como decisión: quedaba a que el evaluador lo dedujera leyendo el código.

**Decisión:** sesión enteramente **stateless** sobre un único JWT firmado con HS256, sin refresh token y sin registro de sesiones en la base.

- **Emisión:** `POST /auth/login` devuelve `{ accessToken, user }`. El payload lleva `sub` (id), `email` y `role` — nada sensible, y el `role` viaja adentro para que `RolesGuard` no tenga que ir a la base en cada request.
- **Vigencia:** `JWT_EXPIRES_IN`, default `1d`. Suficientemente largo para que el evaluador no tenga que reloguear mientras prueba, suficientemente corto para que un token filtrado no sea eterno.
- **Transporte:** header `Authorization: Bearer <token>` en REST, y el **mismo** token en el handshake de Socket.IO (`handshake.auth.token`). Un solo mecanismo, un solo lugar donde puede estar mal.
- **Persistencia en el cliente:** `expo-secure-store` (Keychain/Keystore), no AsyncStorage. Al abrir la app, `hydrate()` lee token + usuario y el `status` del store arranca en `'loading'`, así `Stack.Protected` no muestra el login un instante antes de resolver.
- **Expiración en caliente:** un 401 en cualquier request autenticada (o un socket rechazado) dispara logout + el banner "Tu sesión expiró" en el login. Es el único camino por el que la sesión se cierra sola.

**Por qué stateless y no sesiones en base:** un store de sesiones (o refresh tokens rotativos) agrega una colección, su invalidación y un endpoint de refresh — y el beneficio real, poder revocar antes del vencimiento, no aplica a nada que la consigna pida. El costo se paga en un solo punto, documentado abajo.

**Límite conocido — el logout no revoca nada:** `logout()` borra el token del dispositivo y corta el socket, pero el JWT sigue siendo válido contra la API hasta que venza. Es inherente a una sesión stateless: si el token ya fue copiado del dispositivo, cerrar sesión no lo apaga. Con refresh tokens se resolvería guardando un `jti` o un `tokenVersion` por usuario y rechazando los emitidos antes del logout — un campo en `users` y un chequeo en `JwtStrategy`. No se hizo por lo de arriba.

**Límite conocido — `hydrate()` confía en el token guardado:** no lo valida contra la API al arrancar. Si venció con la app cerrada, se ve un instante el listado de chats hasta que el primer request devuelve 401 y rebota al login (con el banner, así que no es un cierre silencioso). La alternativa era un `GET /users/me` bloqueante en cada arranque: agrega latencia a todos los arranques para mejorar el caso raro.

**Alternativas consideradas:** refresh token + access token corto (lo correcto para una app real con sesiones largas, alcance no pedido acá); sesión con cookie `httpOnly` (no aplica: el cliente es React Native, no un browser, y el socket necesita el token explícito).

## 2026-09-27 — El secreto de firma nunca cae a un default conocido

**Contexto:** `configuration.ts` resolvía el secreto como `process.env.JWT_SECRET ?? 'dev-secret-change-me'`, y `docker-compose.yml` inyectaba ese mismo string como default. Si el `.env` no se cargaba, el backend arrancaba **normal**, sin ninguna señal, firmando con un valor que está publicado en un repo público. Cualquiera que lea el repo puede forjar un JWT válido para cualquier usuario, incluido el `admin` del seed: es el agujero de autenticación más grave que tenía el proyecto, y era invisible.

**Decisión:** sin un `JWT_SECRET` usable, el backend genera un secreto **random de 32 bytes para ese proceso** y lo avisa por log. Los dos placeholders que viven en el repo (`dev-secret-change-me` y el `replace-with-a-long-random-secret` de `.env.example`) se tratan igual que si la variable no estuviera: no son secretos. El valor generado se memoiza a nivel de módulo — un random distinto por llamada haría que `JwtModule` firme con uno y `JwtStrategy` verifique con otro, y no entraría ningún token.

**Por qué no cortar el arranque,** que sería el reflejo de "fail fast": el único modo de fallar útil sería colgarse de `NODE_ENV === 'production'`, y en este proyecto esa variable **no significa "deploy real"** — el Dockerfile la setea para `npm ci --omit=dev`, y esa es la misma imagen que corre `docker compose up`, el camino de un comando con el que se prueba la entrega. Un throw ahí rompería la instalación limpia del evaluador por una variable que no tiene por qué definir. El secreto random deja el arranque funcionando y mueve el costo a algo visible y acotado: los tokens ya emitidos dejan de valer en cada reinicio, con el log diciendo exactamente por qué. Lo que importaba era que no exista un secreto **adivinable**, y eso se cumple en los dos casos.

**`docker-compose.yml` dejó de inyectar el placeholder** (`JWT_SECRET: ${JWT_SECRET:-}`): ahora exportar `JWT_SECRET` antes de `docker compose up` es lo único que hace que la sesión sobreviva un reinicio del contenedor, y está comentado ahí mismo. Ya no hay ningún secreto de firma escrito en el repo.

**Cubierto por tests** (`src/config/configuration.spec.ts`): que un valor real pase intacto y sin warning, que la ausencia no caiga nunca al string viejo, que los dos placeholders se rechacen, y que el generado sea estable dentro del proceso.

## 2026-09-27 — Login no valida el largo de la contraseña

**Contexto:** `LoginDto` tenía `@MinLength(8)` en `password`, espejado en el `zod` de la pantalla de Sign In. Con una contraseña de menos de 8 caracteres, `POST /auth/login` devolvía **400 "La contraseña debe tener al menos 8 caracteres"** en vez del 401 genérico.

**Decisión:** en login la contraseña solo se exige presente (`@IsNotEmpty()`). La política de largo se valida donde se define, en `CreateUserDto` (el alta de cuenta), que es el único lugar que la aplica de verdad.

**Por qué:** eran dos problemas en una línea. Uno, le publica la política de contraseñas a alguien sin autenticar. Dos, y más importante, rompe la propiedad que el resto del flujo cuida con cuidado: `AuthService` devuelve el mismo `"Credenciales inválidas"` para email inexistente y para password incorrecta, justamente para no dar señal de qué falló — y el DTO, un paso antes, distinguía por formato. Para quien intenta entrar, "demasiado corta" y "incorrecta" son el mismo hecho: no entraste. Validar el largo en login también implicaría que si la política sube a 12, todas las cuentas viejas dejarían de poder loguear con un error de validación en vez de poder cambiar su contraseña.

**Se espejó en el mobile:** el `zod` de `app/sign-in.tsx` pasa a `min(1, 'Ingresá tu contraseña')`. El mensaje viejo aparecía en la pantalla de login, que es el lugar donde menos sirve. `app/(app)/new-user.tsx` (alta de cuenta) mantiene el `min(8)` sin cambios.

**Cubierto por tests:** el e2e agrega que una contraseña corta devuelve **401** (no 400) y que una vacía sí devuelve 400 — no hay nada que comparar. El test de la pantalla de Sign In ahora afirma también el mensaje del campo de contraseña vacío, que es el caso cuyo comportamiento cambió.

## 2026-09-27 — El orden del listado de Users se resuelve en el servidor, no en el cliente

**Contexto:** la consigna pide, para el listado de usuarios, "filtro de texto, **paginado y ordenamiento**". El filtro y el paginado estaban; el ordenamiento existía en el backend (`sortBy`/`sortOrder` en `QueryUsersDto`) pero la app no lo exponía, así que el requisito estaba a medio cumplir.

**Decisión:** la hoja modal (`mobile/src/components/UsersSortSheet.tsx`) no reordena nada en memoria: traduce la opción elegida a un par `sortBy`/`sortOrder` y vuelve a pedir la **página 1** al servidor. Ordenar del lado del cliente solo reordenaría los 20 usuarios de la página actual, que con paginado es directamente un orden incorrecto — la opción "Nombre Z–A" tiene que traer a los últimos del padrón, no dar vuelta los que ya estaban a la vista.

**Cambiar el orden resetea la página**, igual que cambiar la búsqueda: la página 3 del listado anterior no significa nada en el nuevo.

**`lastSeenAt` se agregó a los campos ordenables** del backend para cubrir la opción "Actividad reciente" del mock. El campo ya existía en el modelo (lo mantiene la presencia). Es nullable, y en Mongo `null` ordena por debajo de cualquier fecha, así que en `desc` los usuarios que nunca se conectaron quedan al final — que es lo que se espera de ese orden.

**La selección es en borrador:** tocar una opción no aplica nada hasta "Aplicar orden", porque el mock tiene botones Cancel/Apply al pie. Por eso el estado vive en la hoja y no en la pantalla, y se resetea al valor aplicado en cada apertura (`onShow` del `Modal`): cancelar y volver a abrir no arrastra lo que se había tocado antes.

**El default del cliente es el mismo que el del backend** (`lastName` asc): así el primer render no dispara un reordenamiento contra lo que el server ya iba a devolver. Hay un test que fija justamente eso, para que los dos defaults no se separen en silencio.

**Fuera de alcance:** los chips "All / Online / Offline" del mismo mock (filtrar por estado de conexión) necesitarían un parámetro nuevo en el backend, que hoy no existe, y no los pide la consigna. Anotado en `docs/PROGRESS.md`.

## 2026-09-27 — Las `options` de `<Stack.Screen>` se memoizan (loop de render en Users)

**Contexto:** entrar al tab Users terminaba en "Maximum update depth exceeded". El stack de error apuntaba al `<Stack>` de `app/(app)/_layout.tsx`, no a la pantalla, lo que despistaba: el layout no tenía nada raro.

**Causa:** el `<Screen>` de expo-router (`node_modules/expo-router/build/views/Screen.js`) mete `options` **por referencia** en las dependencias del layout effect que llama a `navigation.setOptions`:

```js
useSafeLayoutEffect(() => {
  if (options && Object.keys(options).length) { navigation.setOptions(options); }
}, [isFocused, isPreloaded, navigation, options]);
```

`users.tsx` le pasaba un objeto literal inline, o sea una referencia nueva en cada render. El efecto corría siempre, `setOptions` cambiaba el estado del navegador, eso re-renderizaba la pantalla, y vuelta a empezar.

**Por qué en Users y no en Chats**, que usa el mismo patrón (`<Stack.Screen options={{ title: 'Chats' }} />`): react-navigation corta el ciclo cuando las opciones resultantes son equivalentes, y `'Chats'` es el mismo string siempre. Users pasaba además un `headerRight: () => (...)`, una **función nueva en cada render**, que nunca compara igual — el ciclo no se cerraba nunca. Es un footgun latente en cualquier pantalla que ponga una función en `options` inline.

**Decisión:** las `options` se arman con `useMemo` con el rol como única dependencia, así `setOptions` corre una vez y no una por render. No es una optimización: sin eso la pantalla no funciona.

**No está relacionado con quién ve el botón.** El loop pasaba igual con un admin logueado (el `headerRight` era el mismo para todos); el síntoma apareció mientras se probaba con un usuario común, pero esconder el botón no habría arreglado nada — solo habría movido el crash al admin, que es justamente quien lo necesita. Las dos cosas se corrigieron juntas pero son independientes.

## 2026-09-27 — Un id malformado devuelve 400, no 500

**Contexto:** `GET /users/no-es-un-objectid` devolvía **500 "Ocurrió un error inesperado"**. Igual `GET /chats/abc/messages`. Lo encontró la auditoría de cumplimiento contra la consigna, probando la API real: no había validación de formato de ObjectId en ningún punto del backend.

**Causa:** cuando Mongoose no puede convertir un string a `ObjectId` tira un `CastError`, que no es una `HttpException`. El filtro global (`http-exception.filter.ts`) lo tomaba por la rama de "error no controlado" y lo reportaba como 500.

**Decisión:** el filtro reconoce `MongooseError.CastError` y lo mapea a **400 Bad Request**, con el mensaje `El valor de "<campo>" no es un id válido`.

**Por qué en el filtro y no con un pipe por ruta:** un `ParseObjectIdPipe` habría que acordarse de aplicarlo en cada `:id`, `:chatId` y en cualquier ruta futura — el día que uno se olvide, vuelve el 500 en silencio. En el filtro es un solo punto que cubre todas las rutas actuales y las que vengan, incluido el caso en que el id malformado no venga de un parámetro de ruta sino del body o de una query.

**El valor crudo no se devuelve:** el mensaje nombra el campo que falló (`_id`, `chatId`), no lo que mandó el cliente. Reflejar input sin tratar en una respuesta de error es un hábito que no vale la pena tener, aunque acá el `Content-Type` sea JSON y el riesgo concreto sea bajo.

**Un caso queda en 403 y es correcto:** `PATCH /users/abc` sigue devolviendo 403 en vez de 400, porque `RolesGuard` corre **antes** — en el pipeline de Nest los guards van antes que pipes y filtros, así que la autorización se resuelve primero. No se cambió: un id ajeno malformado no tiene por qué revelar más que uno ajeno bien formado.

**Cubierto por tests:** `http-exception.filter.spec.ts` (5 casos: passthrough de `HttpException`, mapeo a 400, que no filtre el valor crudo, que un error inesperado siga siendo 500 sin stack, y que el shape sea siempre el mismo) y el e2e, que lo afirma contra la app real en las dos rutas.

## 2026-09-27 — Todos los avisos pasan por `showAlert`/`showChoice`

**Contexto:** cuatro llamadas usaban `Alert.alert` de react-native directo — `profile.tsx` (confirmación de eliminar cuenta), `users.tsx` (confirmación de eliminar usuario y dos avisos de error). En el target web eso no hace **nada**: el `Alert` de react-native-web es literalmente `class Alert { static alert() {} }` (verificado en `node_modules/react-native-web/dist/exports/Alert/index.js`).

**Consecuencia real:** corriendo la app en el browser, "Eliminar cuenta" y "Eliminar usuario" eran botones muertos — el diálogo nunca aparecía, así que el `onPress` de confirmación nunca corría — y dos errores se tragaban en silencio. El README propone el browser como segundo cliente para probar el chat en vivo, así que es un camino que se recorre de verdad.

**Decisión:** las cuatro pasan por `showAlert`/`showChoice` (`src/utils/alert.ts`), que ya existían **exactamente por este motivo** y tienen su variante `.web` con `confirm()` encadenado. No se agregó nada nuevo: se terminó de aplicar una solución que el proyecto ya había tomado y que estas cuatro llamadas se habían salteado.

**`Choice` ganó un `style?: 'destructive'` opcional** para no perder el rojo de iOS en las dos confirmaciones de borrado. La variante web lo declara y lo ignora, así las dos implementaciones mantienen la misma firma.

**El "Cancelar" ya no se escribe a mano:** `showChoice` lo agrega siempre, así que cada confirmación declara solo su acción afirmativa. Es una llamada más corta y no se puede olvidar el botón de salida.
