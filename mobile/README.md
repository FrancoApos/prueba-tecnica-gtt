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
- **Simulador iOS (requiere Mac):** apretá `i`.

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
├── store/                    Zustand: session (JWT + usuario) y chats (listado + lastMessage)
├── hooks/useMessages.ts       Estado de la conversación (fetch, envío, optimistic update del listado)
├── components/                Avatar, ChatListItem, MessageBubble, StateView (loading/error/empty), FormTextInput
├── types/api.ts               Tipos que reflejan los DTOs del backend
└── config.ts                  URL de la API (EXPO_PUBLIC_API_URL) y resolución de URLs de adjuntos
```

## Decisiones y alcance

Detalle completo en [`../docs/DECISIONS.md`](../docs/DECISIONS.md).

- **Sin pantalla de registro**: la consigna solo pide login. La creación de usuarios es responsabilidad del backend (`POST /users`, usado por el seed). Para poder iniciar una conversación nueva desde la app (necesario para que el flujo "listado → conversación" sea usable, no solo con chats preexistentes) se agregó una pantalla mínima de "Nuevo chat" que busca usuarios ya dados de alta y abre/crea el chat — no es una funcionalidad pedida explícitamente, pero es indispensable para poder demostrar el flujo completo. Se dispara desde un FAB en el listado de chats (siguiendo el diseño de Stitch).
- **Módulo de Users (obligatorio, ver `docs/REQUIREMENTS.md`)**: tab "Users" con búsqueda + paginado del directorio. Tocar una fila inicia un chat con esa persona (mismo mecanismo que "Nuevo chat"). Editar/eliminar la cuenta de *otro* usuario solo se muestra si `session.user.role === 'admin'` — la autorización real la exige el backend (`RolesGuard`), esto solo evita ofrecer un botón que el servidor va a rechazar. Detalle en `docs/DECISIONS.md` ("Roles (self-or-admin)...").
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

Cubren: el store de sesión (login/logout/hidratación desde SecureStore), utilidades puras de formateo, y el formulario de login (validaciones, submit exitoso, error de credenciales inválidas).

> Nota: vas a ver algunos `console.error` de "overlapping act() calls" al correr los tests de `sign-in`. Es ruido de una incompatibilidad conocida entre esta combinación específica de versiones (React 19.2/Expo SDK 57/RNTL 14, todas muy recientes) — los tests pasan igual; se investigó y se aisló cada escenario en su propio archivo para evitar que ese bug de interop hiciera fallar un test que en aislamiento pasa perfecto.
