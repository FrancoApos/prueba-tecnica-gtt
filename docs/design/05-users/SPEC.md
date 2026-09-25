# 05 — Usuarios

**Módulo obligatorio** (consigna: "Creación, consulta, actualización y eliminación de usuarios" + "Listado con filtro de texto, paginado y ordenamiento"). No implementado todavía en mobile — el backend ya expone todo lo necesario (`GET/POST/PATCH/DELETE /users`, con `search`/`page`/`limit` en el listado). Esta spec documenta el diseño de referencia para cuando se construya.

Fuente: proyecto Stitch "Pulse Chat Design System" (`projects/9603869604031687512`), vía MCP.

| Pantalla Stitch | Archivo |
|---|---|
| Users - Directory | `users-directory.png` |
| Users - Sort Sheet Open | `users-sort-sheet-open.png` |
| New User | `new-user.png` |
| Edit User | `edit-user.png` |
| Delete User - Confirmation | `delete-user-confirmation.png` |

> **Nota de método:** mismo caso que `01-auth`/`04-profile` — el `htmlCode.downloadUrl` de estas pantallas no es confiable (contenido desalineado del lado de Stitch). Spec basada en inspección visual de las capturas (`screenshot.downloadUrl`, verificado correcto) + tokens universales. Como este módulo ni siquiera está implementado todavía, todas las medidas de layout quedan como referencia de diseño a confirmar al construirlo, no como valores ya aplicados.

## Estructura — "Users - Directory"

- Header: "Pulse / Users" (breadcrumb) + ícono de búsqueda + avatar propio arriba a la derecha.
- Subtítulo "Team directory & active roster".
- Search bar ("Search by name or email").
- Fila de controles: dropdown "Sort: Name A-Z", chips "All / Online / Offline" (filtro por estado de conexión).
- Contador "48 users" + "Synced just now" a la derecha.
- Lista de usuarios: avatar + nombre + punto de estado + email, chevron ">" a la derecha (fila tappeable → detalle/edición).
- **Paginación con botones "Previous / Page 2 of 7 / Next"** — nuestro backend ya devuelve `{ data, total, page, limit }`; la UI de paginación (botones, no scroll infinito) queda pendiente de construir.
- Botón "+" flotante arriba a la derecha del header (alta de usuario) — más chico que el FAB circular de `02-chats`, integrado en el header en este caso.
- Tab bar inferior de 3 tabs, con "Users" resaltado/activo.

## Estructura — "Sort by" (bottom sheet)

- Modal desde abajo (overlay oscuro + hoja blanca con esquinas superiores redondeadas).
- Opciones con radio button: "Name A-Z" (con ícono ↓A), "Name Z-A" (↑A), "Recently active" (reloj), "Newest first" (‹).
- Botones "Cancel" (secundario) / "Apply Sort" (primario) al pie.

**Nota de alcance:** nuestro backend soporta `sortBy` (firstName/lastName/email/createdAt) + `sortOrder` (asc/desc) — cubre "Name A-Z/Z-A" y "Newest first" (createdAt desc). "Recently active" necesitaría ordenar por `lastSeenAt`, que el modelo ya tiene pero el backend no expone todavía como campo de `sortBy` — ajuste menor si se implementa este sheet tal cual.

## Estructura — "New User" / "Edit User"

- Mismo patrón de formulario que `04-profile` (Edit Profile): probablemente los mismos campos (nombre, apellido, email, fecha de nacimiento, teléfono) + campo de password en el alta (no en la edición). Backend: `POST /users` pide `email/password/firstName/lastName/birthDate/phone`; `PATCH /users/:id` no acepta email ni password (ver `docs/DECISIONS.md` — email no editable, password fuera de alcance).

## Estructura — "Delete User - Confirmation"

- Modal de confirmación estándar (título + texto de advertencia + botones "Cancel" / acción destructiva en rojo).

## Tokens a aplicar (cuando se construya)

Los mismos que el resto de la app: `colors`, `typography`, `spacing`, `radii`, `sizes` de `src/theme/tokens.ts` — este módulo no necesita tokens nuevos, reutiliza `FormTextInput`, `Avatar`, `StateView` y el mismo lenguaje visual (chips, pill badges, bottom sheet) ya usado en otras pantallas.

## TODO (pantalla no construida — todo por confirmar al implementar)

- Medidas exactas de la fila de usuario en el directory (alto, spacing) — visualmente similar a la fila de chat (`sizes.chatRowHeight`) pero no confirmado que sea idéntica.
- Estilo exacto del bottom sheet de ordenamiento (no hay un patrón de modal/bottom sheet reusable en la app todavía — se construiría desde cero).
- Si el alta/edición de usuario en mobile es necesaria dado que ya existe `POST /users` público usado como alta de cuenta (ver `docs/DECISIONS.md` — "no hay pantalla de registro"): decidir si este módulo es de **autogestión** (cada quien ve/edita su propio perfil, ya cubierto por `04-profile`) o de **administración** (ver/crear/editar/borrar a otros usuarios, lo que el mock sugiere) antes de implementarlo — afecta permisos (el backend actual es self-only para `PATCH`/`DELETE`, ver `docs/DECISIONS.md`).
