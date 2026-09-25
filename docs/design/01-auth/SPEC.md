# 01 — Auth (Sign In)

Fuente: proyecto Stitch "Pulse Chat Design System" (`projects/9603869604031687512`), vía MCP. Capturas en esta carpeta (bajadas con `screenshot.downloadUrl` de cada pantalla, verificadas visualmente 1 a 1 contra su título).

| Pantalla Stitch | Archivo |
|---|---|
| Sign In - Default (Light) | `sign-in-default-light.png` |
| Sign In - Default (Dark) | `sign-in-default-dark.png` |
| Sign In - Validation Error (Light) | `sign-in-validation-error-light.png` |
| Sign In - Validation Error (Dark) | `sign-in-validation-error-dark.png` |
| Sign In - Server Error (Light) | `sign-in-server-error-light.png` |
| Sign In - Server Error (Dark) | `sign-in-server-error-dark.png` |

> **Nota de método:** para este módulo el campo `htmlCode.downloadUrl` que devuelve el MCP de Stitch para estas pantallas no corresponde a su propio contenido (apunta a un "companion file" desalineado — se confirmó bajando y leyendo el HTML: el de "Sign In" trajo el markup de otra pantalla). El `screenshot.downloadUrl` sí se verificó correcto (se abrieron las 6 imágenes y coinciden con su título). Por eso las medidas de layout específicas de esta pantalla (no las de la paleta/tipografía, que sí vienen del `tailwind.config` embebido y ese sí es consistente en todos los archivos) están marcadas `TODO` en vez de inventadas.

## Estructura (de la captura)

- Logo/ícono de la app centrado, arriba.
- Título "Pulse" (nombre de producto en el mock — en nuestra app es "Chat App") + subtítulo "Sign in to continue your conversations".
- Campo **Email** con ícono de sobre a la izquierda, label arriba.
- Campo **Password** con ícono de candado a la izquierda y toggle de mostrar/ocultar (ojo) a la derecha — **no implementado** en nuestra app (el campo es `secureTextEntry` fijo, sin toggle; ver `docs/PROGRESS.md` como posible mejora).
- Link "Forgot password?" alineado a la derecha, debajo del campo de contraseña — **no implementado** (no hay flujo de recuperación de contraseña ni en backend ni en mobile, fuera del alcance de la consigna).
- Botón primario "Sign in →" (con ícono de flecha) full-width.
- Link "Don't have an account? Sign up" al pie — **no aplica**: la consigna no pide registro (ver `docs/DECISIONS.md`), por eso nuestra pantalla no tiene este link.

## Estado de validación (campo inválido)

- Borde del input pasa a `error` (rojo) + ícono de "x" a la derecha del campo.
- Mensaje de error chico debajo del campo, con un ícono de alerta circular + texto (color error).
- Mismo patrón para ambos campos simultáneamente si ambos fallan.

Nuestra implementación (`FormTextInput`) ya sigue este patrón (borde `colors.error` + texto de error debajo), sin el ícono de "x" dentro del campo (`TODO`: agregar si se quiere el 1:1 exacto — es un ícono adicional, no un token de diseño).

## Tokens aplicados (de `tokens.ts`, ver también `docs/design/README.md` si existe la tabla global)

| Elemento | Token |
|---|---|
| Fondo de pantalla | `colors.background` |
| Título | `typography.titleScreen` + `colors.textPrimary` |
| Subtítulo | `typography.bodyDefault` + `colors.textSecondary` |
| Input (fill / borde / radio) | `colors.surfaceContainerLow` / `colors.border` / `radii.control` |
| Input inválido | `colors.error` |
| Botón primario | `colors.primaryContainer` / `colors.onPrimary` / `radii.control` / `sizes.controlHeight` |
| Banner de error de servidor | `colors.errorContainer` / `colors.onErrorContainer` |

## TODO (no confirmado con HTML real, solo visual)

- Padding exacto del contenedor y separación entre campos (usamos `spacing.lg`/`spacing.xl`/`spacing.md`, consistentes con la escala global, pero no confirmados pixel a pixel para esta pantalla puntual).
- Tamaño exacto del logo/ícono superior.
