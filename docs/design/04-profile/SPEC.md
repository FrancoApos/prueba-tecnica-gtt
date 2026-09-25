# 04 — Perfil

Fuente: proyecto Stitch "Pulse Chat Design System" (`projects/9603869604031687512`), vía MCP.

| Pantalla Stitch | Archivo |
|---|---|
| My Profile (Light) | `my-profile-light.png` |
| My Profile (Dark) | `my-profile-dark.png` |
| Edit Profile - Clean State | `edit-profile-clean.png` |
| Edit Profile - Validation Error State | `edit-profile-validation-error.png` |
| Edit Profile - Saving State | `edit-profile-saving.png` |

> **Nota de método:** igual que en `01-auth`, el `htmlCode.downloadUrl` de estas pantallas no corresponde a su propio contenido (mismo problema de "companion file" desalineado del lado de Stitch). Las medidas de esta spec vienen de inspección visual directa de las capturas (`screenshot.downloadUrl`, verificado correcto) más los tokens universales (`tailwind.config` de colores/tipografía, que sí es consistente en todos los archivos). Todo lo que no se puede leer con precisión de una imagen queda marcado `TODO`.

## Estructura — "My Profile" (vista, no edición)

- Header con botón atrás, título "Profile", link "Edit" arriba a la derecha.
- Avatar grande centrado (`TODO`: tamaño exacto — estimado ~`96px` de la captura, usamos `sizes.avatarProfile = 72` en `tokens.ts`, más chico; no confirmado 1 a 1).
- Nombre completo + email debajo del avatar.
- Badge de estado "● Online" (pill, verde).
- Sección "PERSONAL INFORMATION" (label de sección — `typography.sectionLabel`, mayúsculas) con filas: First name, Last name, Date of birth, Phone, Last seen — cada fila con ícono a la izquierda.
- Sección "ACCOUNT" con "Change password" (**no implementado** — no hay endpoint de cambio de contraseña en el backend, fuera de alcance) y "Sign out".
- Tab bar inferior de 3 tabs (Chats/Users/Profile) — ver nota en `02-chats/SPEC.md`.

## Estructura — "Edit Profile"

- Header con "X" (cerrar) a la izquierda, "Cancel"/"Save" a los costados del título — nuestra app usa un único botón "Guardar cambios" al pie en vez de un "Save" en el header; diferencia de layout, no de estilo.
- Avatar con botón de cámara superpuesto + link "Change photo" + hint "JPG or PNG, up to 5MB" — **no implementado**: el backend solo acepta una URL para `avatarUrl`, no upload de archivo en el perfil (ver `docs/DECISIONS.md`).
- Campos: First name, Last name, Email (con hint "Must be unique" — coincide con la validación real del backend), Date of birth (con ícono de calendario, sugiere un date picker nativo — nuestra implementación usa un `TextInput` de texto plano con formato `AAAA-MM-DD`, simplificación consciente, no hay `@react-native-community/datetimepicker` instalado), Phone.
- **"Availability"**: segmented control de 2 botones (Online / Offline) en vez de un `Switch` — nosotros usamos `Switch` (componente nativo, misma función, distinto control visual). `TODO` si se quiere el 1:1 exacto.
- Banner "Verified Profile" — no tiene equivalente en nuestro modelo de datos (no hay concepto de verificación), no implementado.

## Estado "Saving"

- El botón de guardar muestra un spinner y se deshabilita — coincide con lo ya implementado (`ActivityIndicator` en el botón, `disabled={isSubmitting}`).

## Estado de validación

- Mismo patrón que en `01-auth`: borde rojo + mensaje debajo del campo.

## Tokens aplicados

| Elemento | Token |
|---|---|
| Avatar | `sizes.avatarProfile` |
| Card de estado de conexión | `colors.surface`, `radii.control` |
| Inputs | igual que `01-auth` (`FormTextInput` compartido) |
| Feedback de éxito | `colors.successContainer` / `colors.onSuccessContainer` |
| Feedback de error | `colors.errorContainer` / `colors.onErrorContainer` |
| Botón "Cerrar sesión" | texto `colors.error`, sin fill (coincide con el mock, que también lo muestra como link/texto, no botón sólido) |

## TODO (no confirmado con HTML real)

- Tamaño exacto del avatar en "My Profile" (estimado visualmente, no medido).
- Padding/spacing exactos de las filas de "Personal Information".
- Estilo exacto del segmented control "Availability" (colores/tamaño) si se decide adoptarlo en vez del `Switch`.
