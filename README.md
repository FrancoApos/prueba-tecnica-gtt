# Prueba Técnica Full Stack — Chat App (React Native + NestJS)

Monorepo para la prueba técnica: aplicación móvil de chat con backend en **NestJS + MongoDB** y frontend en **React Native + TypeScript**.

## Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | NestJS, TypeScript, MongoDB (Mongoose), JWT (`passport-jwt`), class-validator, Swagger, Multer, Socket.IO |
| Mobile | React Native (Expo, Expo Router), TypeScript, Zustand, react-hook-form + zod, Socket.IO client |
| Tests | Vitest + `mongodb-memory-server` (backend), Jest + React Native Testing Library (mobile) |
| Infra | Docker Compose (Mongo + backend, con seed automático) |

### Dependencias externas y para qué está cada una

La consigna permite bibliotecas externas "cuando su uso esté documentado". Estas son todas las de runtime que no vienen con el framework:

| Backend | Para qué |
|---|---|
| `mongoose` / `@nestjs/mongoose` | ODM de MongoDB: schemas, índices y queries |
| `@nestjs/jwt` + `passport` / `passport-jwt` / `@nestjs/passport` | Emisión y verificación del JWT, y el guard que protege las rutas |
| `bcryptjs` | Hash de contraseñas. La variante JS pura evita el build nativo de `bcrypt`, que rompe el `npm ci` de la imagen Alpine |
| `class-validator` / `class-transformer` | Validación y transformación de los DTOs vía `ValidationPipe` |
| `libphonenumber-js` | Lo exige el `@IsPhoneNumber` que valida el teléfono del perfil: `class-validator` lo carga internamente (`libphonenumber-js/max`). Nuestro código no lo importa; está declarado explícito para no depender de que siga llegando como transitiva |
| `@nestjs/swagger` | Documentación de la API en `/docs` |
| `socket.io` / `@nestjs/websockets` / `@nestjs/platform-socket.io` | Push de mensajes y presencia en vivo |
| `@nestjs/config` | Carga y tipado de las variables de entorno |
| `multer` | Recepción de los archivos subidos (`diskStorage`, con una config por módulo: adjuntos en `messages.module.ts`, fotos de perfil en `users.module.ts`). Llega como transitiva de `@nestjs/platform-express`, que es quien expone el `FileInterceptor` |

| Mobile | Para qué |
|---|---|
| `expo-router` | Navegación por archivos, incluido el gate de sesión (`Stack.Protected`) |
| `zustand` | Estado global acotado: sesión y listado de chats |
| `react-hook-form` + `zod` + `@hookform/resolvers` | Formularios con validación por esquema y error por campo |
| `expo-secure-store` | Token de sesión en Keychain/Keystore, no en AsyncStorage |
| `expo-image-picker` / `expo-document-picker` | Elegir la imagen o el archivo a adjuntar en la conversación, y la foto de perfil (con recorte cuadrado) |
| `socket.io-client` | Cliente del canal de tiempo real |
| `@expo-google-fonts/inter` + `expo-font` | Tipografía del design system |
| `@expo/vector-icons` | Íconos de la UI |
| `react-native-safe-area-context` | Respetar notch y home indicator en la conversación |
| `react-native-screens` / `react-native-gesture-handler` | Requeridos por expo-router para la navegación nativa |
| `react-native-web` / `react-dom` / `@expo/metro-runtime` | Correr la misma app en el browser, que sirve de segundo cliente para probar el chat en vivo |

## Requisitos

- **Node.js 24+** y npm.
- **MongoDB 7+** corriendo en algún lado (local, Docker o Atlas). No hace falta si vas por Docker Compose, que ya lo incluye, ni para correr los tests del backend: usan un Mongo en memoria (`mongodb-memory-server`).
- Para la app mobile, alguna de estas:
  - **Expo Go** en un celular físico ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) — el celular y la PC tienen que estar en la **misma red Wi-Fi**, y `EXPO_PUBLIC_API_URL` tiene que apuntar a la **IP de LAN** de la PC, no a `localhost`.
  - Un simulador de iOS (macOS + Xcode) o un emulador de Android.
  - El browser de la PC (`npx expo start --web`), que no necesita nada extra y sirve además como segundo cliente para probar el chat en vivo.
- **Docker** solo si querés levantar todo con `docker compose` en vez de a mano.

## Variables de entorno

Cada proyecto tiene su `.env.example`: se copia a `.env` y se ajusta.

### `backend/.env`

| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto HTTP del backend | `3000` |
| `MONGODB_URI` | Connection string de MongoDB | `mongodb://localhost:27017/chat-app` |
| `JWT_SECRET` | Secreto para firmar los JWT. Sin definir (o con el valor de ejemplo del repo), el backend **genera uno random por proceso y lo avisa por log**: la app arranca, pero los tokens dejan de valer en cada reinicio. Definilo con `openssl rand -hex 32` | *(sin default — nunca cae a un valor conocido)* |
| `JWT_EXPIRES_IN` | Vigencia del token | `1d` |
| `CORS_ORIGIN` | Origen permitido para CORS | `*` |
| `UPLOADS_DIR` | Carpeta donde se guardan los adjuntos de mensajes y las fotos de perfil (estas últimas en la subcarpeta `avatars/`), relativa a `backend/` | `uploads` |

### `mobile/.env`

| Variable | Descripción | Default |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | URL base del backend. Expo embebe las `EXPO_PUBLIC_*` en el bundle, así que hay que **reiniciar** `expo start` después de cambiarla | `http://localhost:3000` |

El valor correcto depende de dónde corra la app:

| Dónde corre la app | Valor |
|---|---|
| Browser de la PC, o simulador de iOS | `http://localhost:3000` |
| Emulador de Android | `http://10.0.2.2:3000` (el `localhost` del emulador no es el de tu PC) |
| Celular físico con Expo Go | La IP de LAN de la PC, ej. `http://192.168.1.100:3000` |

Para probar un chat en vivo entre el celular y la PC al mismo tiempo, poné la **IP de LAN** en los dos: el browser también la alcanza, y así no hay dos configuraciones distintas que puedan fallar por separado.

## Instalación

```bash
cd backend && npm install && cp .env.example .env && cd ..
cd mobile  && npm install && cp .env.example .env && cd ..
```

## Ejecución

### Todo junto con Docker (backend + Mongo)

```bash
docker compose up --build
```

Levanta Mongo, seedea los datos de prueba y arranca la API en `http://localhost:3000`, con Swagger en `http://localhost:3000/docs`, en un solo comando. La app mobile se corre aparte igual que siempre (abajo).

Probado corriendo: los dos contenedores quedan `healthy` y se verificó contra la API del contenedor el login, la subida y el servido de la foto de perfil y los adjuntos de mensajes. El backend corre como usuario sin privilegios (`node`), y las subidas viven en un volumen (`backend-uploads`) que sobrevive a los reinicios.

### A mano

**Backend** — necesita un Mongo alcanzable en `MONGODB_URI`:

```bash
cd backend
npm run seed        # carga los datos de prueba (hace build + seed)
npm run start:dev   # API en http://localhost:3000, Swagger en /docs
```

**Mobile** — con el backend ya corriendo:

```bash
cd mobile
npx expo start
```

Eso levanta Metro y muestra un **QR** en la terminal. A partir de ahí, según dónde quieras abrirla:

#### En un iPhone (o Android) físico, con Expo Go

1. Instalá **Expo Go** ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).
2. Poné el celular y la PC en la **misma red Wi-Fi**.
3. En `mobile/.env`, `EXPO_PUBLIC_API_URL` tiene que ser la **IP de LAN de la PC**, no `localhost` — para el celular, `localhost` es él mismo. Para averiguarla: `ipconfig` en Windows (buscá "Dirección IPv4", algo como `192.168.x.x`) o `ifconfig | grep inet` en macOS/Linux. Queda, por ejemplo, `EXPO_PUBLIC_API_URL=http://192.168.1.100:3000`.
4. Si cambiaste el `.env`, **reiniciá `expo start`**: Expo embebe las `EXPO_PUBLIC_*` en el bundle al arrancar.
5. Escaneá el QR con la **app de Cámara** (iOS) o desde **Expo Go** (Android).

> Si la app abre pero no puede conectar con la API, probá desde el browser del celular `http://<IP-de-tu-PC>:3000/health`. Si desde la PC responde y desde el celular no, casi siempre es el **Firewall de Windows** bloqueando conexiones entrantes al puerto 3000.

#### En el browser de la PC

Con `expo start` corriendo, apretá **`w`**. O directo:

```bash
npx expo start --web
```

Acá `EXPO_PUBLIC_API_URL=http://localhost:3000` alcanza. Sirve como **segundo cliente** para ver el chat y la presencia en vivo (iPhone ↔ PC) sin instalar un emulador. No es el target de entrega — la sesión cae a `localStorage` en vez del almacén seguro del dispositivo y los diálogos nativos degradan a los del browser.

> Si vas a usar los dos a la vez, poné la **IP de LAN en ambos**: el browser también la alcanza, y así no hay dos configuraciones distintas que puedan fallar por separado.

#### En un emulador

Con `expo start` corriendo: **`a`** para un emulador de Android (usa `http://10.0.2.2:3000`), **`i`** para el simulador de iOS (requiere macOS + Xcode; en Windows no existe, para iPhone usá Expo Go).

Detalle de cada lado en [`backend/README.md`](backend/README.md) (arquitectura, rutas principales, tests) y [`mobile/README.md`](mobile/README.md) (estructura, pantallas).

## Tests

No hace falta ni Docker ni un Mongo corriendo: los del backend levantan su propio MongoDB en memoria.

```bash
cd backend
npm test          # unitarios (Vitest)
npm run test:e2e  # e2e: levanta la app completa contra un Mongo en memoria
npm run lint      # oxlint

cd ../mobile
npm test          # Jest + React Native Testing Library
```

Última corrida verde (2026-09-28): **42 unitarios + 4 e2e** en backend, **34 en mobile** (8 suites), y `tsc --noEmit` limpio en los dos proyectos.

## Datos de prueba

`npm run seed` en `backend/` (o `docker compose up`, que lo corre solo) crea tres usuarios, con un chat y mensajes de ejemplo entre ellos:

| Email | Password | Rol |
|---|---|---|
| `ana@example.com` | `Sup3rSecret!` | `user` |
| `bruno@example.com` | `Sup3rSecret!` | `user` |
| `admin@example.com` | `Sup3rSecret!` | `admin` |

Logueate con dos de ellos en dos clientes distintos (por ejemplo `ana` en el celular y `bruno` en el browser) para ver los mensajes y la presencia actualizándose en vivo. Con `admin` aparecen además las acciones de editar y eliminar la cuenta de *otro* usuario en el tab **Usuarios**.

> ⚠️ **Con Docker, el seed corre en cada arranque del contenedor y *borra* lo que hayas creado.** Es a propósito — `docker compose up` siempre deja el mismo estado conocido, sin pasos manuales — pero significa que si creás un usuario o mandás mensajes y después reiniciás el contenedor, eso desaparece. **No es que la persistencia falle**: los datos viven en un volumen (`mongo-data`) y sobreviven mientras el contenedor no se reinicie. Para probar que persisten de verdad, corré el backend a mano (`npm run start:dev`, sin el seed) y reiniciá el proceso: los datos siguen ahí. Ver [`backend/README.md`](backend/README.md#docker).

Detalle del seed en [`backend/README.md`](backend/README.md#datos-de-prueba-seed).

## Decisiones relevantes

Detalle completo, con contexto y alternativas descartadas, en [`docs/DECISIONS.md`](docs/DECISIONS.md). Resumen:

### Modelado y backend

- **MongoDB aprovechado como base documental, no como SQL disfrazado.** Está impuesto por la consigna, pero el modelo se pensó para eso: `Chat.lastMessage` guarda una copia denormalizada del último mensaje (evita joinear `messages` solo para listar chats), `Message.attachment` es un subdocumento embebido (no una colección aparte para algo que siempre vive con su mensaje), y `participantsKey` (`[idMenor, idMayor].join('_')` + índice único) reemplaza el `UNIQUE(par)` que Mongo no tiene nativamente. Ver [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md).
- **Chats solo 1 a 1**, no grupales: la consigna habla de conversaciones entre dos usuarios, y soportar grupos cambiaría el modelo (`participants` de largo variable, sin la clave única del par) sin agregar nada a lo que se evalúa.
- **`User` y su perfil en una sola colección**, no dos con referencia: es una relación 1 a 1 que siempre se lee junta.
- **`POST /users` es el alta de cuenta**: no hay un endpoint de "registro" separado ni una pantalla aparte.
- **Sesión stateless sobre un único JWT**, sin refresh token ni sesiones en base: `POST /auth/login` devuelve el token (vigencia `JWT_EXPIRES_IN`, default `1d`), que viaja como `Bearer` en REST y en el handshake del socket, y en el dispositivo vive en `expo-secure-store` (Keychain/Keystore). Un 401 en cualquier request autenticada cierra la sesión sola y vuelve al login con el aviso de "tu sesión expiró". Contrapartida asumida y documentada: el logout no revoca el token del lado del servidor, sigue válido hasta vencer.
- **Roles self-or-admin, con un único login para todos.** `PATCH` y `DELETE /users/:id` los resuelve un `RolesGuard` genérico: el dueño siempre puede actuar sobre lo suyo, y actuar sobre la cuenta de otro requiere rol `admin`. El rol nunca se acepta en el alta (nadie se autopromueve): el único admin nace en el seed. El gate del mobile es cosmético — el que manda está en el servidor.
- **Adjuntos en disco** (`uploads/`), sin S3 ni base64 en la base. Los sirve un controller propio y no `useStaticAssets`, porque el archivo se guarda en disco con un UUID y el nombre original vive en la base: el controller lo consulta para poder mandarlo en el `Content-Disposition`. Ese header va siempre como `attachment`, que además de dar el nombre correcto evita que un `.html` o `.svg` subido como adjunto se ejecute en el origen de la API (XSS almacenado).
- **La foto de perfil es un archivo subido, no una URL pegada a mano.** Tiene rutas propias (`POST`/`DELETE /users/:id/avatar`) y storage propio (`uploads/avatars/`), separado del de adjuntos: un adjunto pertenece a un mensaje y es inmutable, una foto pertenece a un usuario, se reemplaza y se borra con la cuenta. `avatarUrl` **no es escribible por el cliente** — lo arma el servidor, porque si no se podría apuntar a cualquier path del servidor o a un host arbitrario. Solo acepta png/jpeg/webp, nunca SVG: a diferencia de un adjunto, un avatar se sirve *inline* (es un `<Image>`), así que la defensa del `Content-Disposition` no aplica y la única que queda es no aceptar formatos ejecutables.
- **Tiempo real como *push* sobre REST.** Socket.IO no lo pedía la consigna; se agregó porque un chat se prueba de verdad con dos clientes a la vez. El gateway **no acepta escrituras**: el mensaje se persiste por `POST /chats/:chatId/messages` y recién después se empuja a los participantes, así no hay un segundo camino de escritura que valide y autorice por separado. El handshake del socket usa el mismo JWT que el REST.
- **Presencia derivada de la conexión del socket** (contando sesiones abiertas por usuario), no de un campo que el cliente actualice a mano.

### Mobile

- **Expo + Expo Router** en vez de React Native CLI puro: permite probar en un celular físico sin montar la cadena de build nativa, y el routing por archivos deja el gate de auth declarativo (`Stack.Protected`).
- **Zustand** (la consigna dejaba elegir entre Redux, Zustand y Context) y con alcance acotado: solo es global lo que se comparte entre pantallas — `sessionStore` (usuario + auth) y `chatsStore` (listado + último mensaje). Los mensajes de una conversación y el listado paginado de Users viven en un hook local a su pantalla: meterlos en un store obligaría a keyear por chat e invalidar caché sin ningún beneficio real acá.
- **Cero valores de estilo sueltos en los componentes**: la UI se repintó desde el design system real generado en Stitch, con los tokens (color, tipografía, spacing, radios, sombras) centralizados en `src/theme/tokens.ts`. Ver [`docs/design/`](docs/design).
- **La app corre también en el browser** (`react-native-web`), lo que da un segundo cliente para probar el chat en vivo desde la PC. Costó tres *platform splits* (`secure-storage`, `alert`, `attachment-form`) porque SecureStore, `Alert` y el `FormData` de archivos no existen, o no se comportan igual, en web.
- **El multipart de los adjuntos se arma distinto en nativo y en web**, por dos polyfills de Expo y React Native que no se hablan entre sí. Es el caso donde más se fue el diagnóstico: está contado completo en la entrada del 2026-09-27 de `docs/DECISIONS.md`.

### Tests y tooling

- **Los tests no dependen de Docker ni de un Mongo externo**: los e2e levantan la app completa (con los mismos pipes, filtros y CORS que producción, vía `setup-app.ts`) contra `mongodb-memory-server`, así que `npm run test:e2e` corre igual en cualquier máquina y en CI.

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

## Estado del proyecto

Ver [`docs/PROGRESS.md`](docs/PROGRESS.md) para el detalle. En resumen: **backend y mobile funcionales de punta a punta** — login, listado de chats, directorio de usuarios, conversación (texto + adjuntos, con mensajes y presencia en **tiempo real** vía WebSocket) y perfil (incluida la **foto de perfil, que se elige de la galería y se sube como archivo**), contra la API real. Verificado en un iPhone físico contra el backend corriendo en la LAN, y el stack completo verificado corriendo en Docker: `docker compose up --build` levanta Mongo + la API con datos de prueba en un comando, y se probaron contra el contenedor el login, la foto de perfil y los adjuntos. Todo lo demás se validó corriendo: la API contra un Mongo real, la app en un iPhone físico, y las tres suites de tests.
