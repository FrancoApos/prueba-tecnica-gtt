# Mobile — Chat App

App en **React Native + TypeScript** (Expo, Expo Router) para la prueba técnica de chat. Consume la API del backend (`../backend`).

## Stack

- **Expo + Expo Router** (navegación por archivos, `Stack.Protected` para el gate de autenticación)
- **Zustand** — estado de sesión (`src/store/session.ts`) y de la lista de chats (`src/store/chats.ts`)
- **react-hook-form + zod** — formularios y validación (login, perfil)
- **expo-secure-store** — persistencia del JWT y del usuario
- **expo-image-picker + expo-document-picker** — adjuntar imagen o archivo a un mensaje
- **Jest + jest-expo + React Native Testing Library** — tests

## Requisitos

- Node.js 24+
- La app del **Expo Go** en tu celular ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)), o un emulador Android / simulador iOS.
- El [backend](../backend) corriendo y alcanzable desde el celular (ver `.env.example`).

## Instalación

```bash
npm install
cp .env.example .env   # ajustar EXPO_PUBLIC_API_URL, ver comentarios en el archivo
```

## Ejecución

```bash
npx expo start
```

Te va a mostrar un **QR**:

- **iPhone/Android físico (Expo Go):** escaneá el QR con la cámara (iOS) o con la app de Expo Go (Android). El celular y esta PC tienen que estar en la **misma red Wi-Fi**.
- **Emulador Android:** con el emulador corriendo, apretá `a` en la terminal donde corre `expo start`.
- **Simulador iOS (requiere Mac):** apretá `i`. En Windows no hay simulador de iOS — para iPhone, usá Expo Go.
- **Browser de la PC:** apretá `w` (o `npx expo start --web`). Sirve como **segundo cliente** para probar el chat en vivo (iPhone ↔ PC) sin instalar un emulador. No es el target de entrega: la sesión se guarda en `localStorage` en vez del almacén seguro del dispositivo, y los diálogos nativos degradan a los del browser (ver `docs/DECISIONS.md`, "App web (react-native-web) como segundo cliente").

**Importante:** `EXPO_PUBLIC_API_URL` en `.env` tiene que apuntar a una URL que el celular pueda alcanzar — `localhost` no sirve para un dispositivo físico porque "localhost" ahí es el propio celular. Usá la IP de LAN de tu PC (ver `.env.example`). Si el backend no responde desde el celular pero sí desde la PC, revisá el Firewall de Windows (puede bloquear conexiones entrantes al puerto 3000 desde otros dispositivos).

## Credenciales de prueba

Corriendo `npm run seed` en `../backend` (ver [`backend/README.md`](../backend/README.md#datos-de-prueba-seed)):

| Email | Password | Rol |
|---|---|---|
| `ana@example.com` | `Sup3rSecret!` | `user` |
| `bruno@example.com` | `Sup3rSecret!` | `user` |
| `admin@example.com` | `Sup3rSecret!` | `admin` — ve los botones de editar/eliminar sobre *otros* usuarios en la tab "Users" |

## Estructura

```
app/                         Rutas (Expo Router — cada archivo es una pantalla)
├── _layout.tsx               Layout raíz: hidrata la sesión y gatea auth con Stack.Protected
├── sign-in.tsx                Login
└── (app)/                     Área autenticada
    ├── (tabs)/
    │   ├── index.tsx           Listado de chats
    │   ├── users.tsx           Directorio de usuarios (buscar/paginar, iniciar chat, editar/eliminar si sos admin)
    │   └── profile.tsx         Perfil (editar datos, estado de conexión, logout)
    ├── chat/[chatId].tsx        Conversación
    ├── new-chat.tsx             Buscar contacto y abrir/crear un chat (modal)
    └── edit-user.tsx            Editar la cuenta de otro usuario (solo admin — el backend es quien lo exige de verdad)

src/
├── api/                      Cliente HTTP centralizado + un módulo por recurso (auth, users, chats, messages)
│   ├── attachment-form.ts     Arma el archivo del FormData (variante .web.ts: Blob real en vez del shape de RN)
│   └── auth-events.ts         Notifica un 401 al store de sesión sin crear un ciclo de imports (ver "Sesión vencida" abajo)
├── realtime/socket.ts        Cliente de Socket.IO: conecta con el JWT y reparte los `message:new` a quien se suscriba
├── store/                    Zustand: session (JWT + usuario) y chats (listado + lastMessage)
│   └── secure-storage.ts      Persistencia de la sesión (variante .web.ts: localStorage, porque SecureStore no existe en web)
├── hooks/useMessages.ts       Estado de la conversación (fetch, envío, mensajes entrantes por WS, optimistic update)
├── utils/alert.ts             Avisos y menús (variante .web.ts: el Alert de react-native-web es un no-op)
├── components/                Avatar, ChatListItem, MessageBubble, StateView (loading/error/empty), FormTextInput
├── types/api.ts               Tipos que reflejan los DTOs del backend
└── config.ts                  URL de la API (EXPO_PUBLIC_API_URL) y resolución de URLs de adjuntos
```

## Decisiones y alcance

Detalle completo en [`../docs/DECISIONS.md`](../docs/DECISIONS.md).

- **Sin pantalla de registro**: la consigna solo pide login. La creación de usuarios es responsabilidad del backend (`POST /users`, usado por el seed). Para poder iniciar una conversación nueva desde la app (necesario para que el flujo "listado → conversación" sea usable, no solo con chats preexistentes) se agregó una pantalla mínima de "Nuevo chat" que busca usuarios ya dados de alta y abre/crea el chat — no es una funcionalidad pedida explícitamente, pero es indispensable para poder demostrar el flujo completo. Se dispara desde un FAB en el listado de chats (siguiendo el diseño de Stitch).
- **Módulo de Users (obligatorio, ver `docs/REQUIREMENTS.md`)**: tab "Users" con búsqueda + paginado del directorio. Tocar una fila inicia un chat con esa persona (mismo mecanismo que "Nuevo chat"). Editar/eliminar la cuenta de *otro* usuario solo se muestra si `session.user.role === 'admin'` — la autorización real la exige el backend (`RolesGuard`), esto solo evita ofrecer un botón que el servidor va a rechazar. Detalle en `docs/DECISIONS.md` ("Roles (self-or-admin)...").
- **Tiempo real por WebSocket**: al iniciar sesión (o al hidratar una guardada) el store abre un socket autenticado con el mismo JWT del REST. La conversación agrega los mensajes que llegan (deduplicados por `id`, porque el server también le reenvía el propio mensaje al remitente para sus otras sesiones) y el listado de chats actualiza preview y orden aunque estés en otra pantalla. Enviar sigue siendo el `POST` de siempre: el WS solo recibe.
- **Sesión vencida → logout + redirect automático**: un JWT vencido/inválido se detecta por dos caminos — un `401` en cualquier request REST autenticado (`api/client.ts`), o el gateway rechazando el socket (`auth:error`, ver `realtime/socket.ts`) — y ambos confluyen en el mismo handler (`api/auth-events.ts`, para no crear un ciclo de imports entre el cliente HTTP y el store de Zustand). Ese handler limpia la sesión y `Stack.Protected` hace el resto: no hay navegación manual, el simple cambio de `status` a `signedOut` alcanza. La pantalla de login muestra "Tu sesión expiró..." solo en este caso, nunca en un logout manual.
- **No se edita el avatar desde la app**: el backend solo acepta una URL de imagen para `avatarUrl` (no upload de archivo en el perfil), así que no tiene una buena UX en mobile — se dejó fuera del alcance.
- **Adjuntos**: se pueden enviar imagen (`expo-image-picker`) o archivo (`expo-document-picker`); se envían de una junto con el texto actual del campo, sin paso de "previsualizar antes de enviar" (simplificación consciente).
- **Diseño**: la UI sigue el design system "Pulse Chat" generado en Stitch (ver `docs/design/`) — colores, tipografía (Inter), spacing y radios viven como tokens en `src/theme/tokens.ts`, sin valores sueltos en los componentes.
- **Dark mode: tokens listos, sin implementar.** `src/theme/tokens.ts` exporta `palette.light` y `palette.dark` completos (extraídos de Stitch), pero la app solo consume `palette.light` — no hay switching real. Es una decisión deliberada: la consigna no pide dark mode en ningún punto, y cablear el cambio de tema implicaría enhebrarlo por todos los componentes (lógica nueva, no solo estilos). El camino natural para implementarlo sería `useColorScheme()` de React Native (seguir el tema del sistema) o un `ThemeContext` (si se quisiera un toggle manual en la app), leyendo de `palette` según corresponda.

## Tests

```bash
npm run test        # Jest + React Native Testing Library
npm run typecheck    # tsc --noEmit
npm run lint          # expo lint
```

**Unit/component tests** (17, `__tests__/`):
- Utilidades de formateo (`getInitials`, `formatRelativeTimestamp`, `formatDayLabel`)
- Store de sesión — login/logout/hidratación desde el almacén seguro, que abra/cierre el canal de tiempo real, y que un 401 (no un logout manual) muestre el mensaje de sesión vencida
- `useMessages` — el envío optimista: el mensaje aparece de inmediato (`pending`) y se confirma con la respuesta del server, o se marca `failed` (sin revertirse) si la request rechaza
- Formulario de login — validaciones, submit exitoso, error de credenciales inválidas (separado en dos archivos, ver nota abajo)

> Nota: vas a ver algunos `console.error` de "overlapping act() calls" al correr los tests de `sign-in`. Es ruido de una incompatibilidad conocida entre esta combinación específica de versiones (React 19.2/Expo SDK 57/RNTL 14, todas muy recientes) — los tests pasan igual; se investigó y se aisló cada escenario en su propio archivo para evitar que ese bug de interop hiciera fallar un test que en aislamiento pasa perfecto.
