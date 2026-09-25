# Diseño — Pulse Chat (Stitch)

Capturas y specs del design system generado en [Stitch](https://stitch.withgoogle.com) (proyecto "Pulse Chat Design System"), usado como fuente de verdad para el repintado de la UI de `mobile/`. Los tokens extraídos de acá viven en [`mobile/src/theme/tokens.ts`](../../mobile/src/theme/tokens.ts).

El repo queda autocontenido: quien evalúe esto no necesita acceso al proyecto de Stitch, las 30 capturas relevantes están acá.

## Módulos

| Carpeta | Spec | Estado en mobile |
|---|---|---|
| [`01-auth/`](01-auth/SPEC.md) | Login | Implementado |
| [`02-chats/`](02-chats/SPEC.md) | Listado de chats | Implementado |
| [`03-conversation/`](03-conversation/SPEC.md) | Conversación | Implementado |
| [`04-profile/`](04-profile/SPEC.md) | Perfil propio | Implementado |
| [`05-users/`](05-users/SPEC.md) | Usuarios (CRUD + listado con filtro/paginado/orden) | **Pendiente** — módulo obligatorio de la consigna, backend ya listo (`GET/POST/PATCH/DELETE /users`), falta la UI mobile |

`manifest.json` en esta carpeta registra, por archivo, el título original de la pantalla en Stitch y su id (`screenId`), para poder volver a ubicarla en el proyecto de Stitch si hace falta.

## Cómo se sacaron las medidas

Para `02-chats` y `03-conversation` se pudo bajar y leer el HTML/CSS real de una pantalla de cada módulo (con el `tailwind.config` de colores embebido, que es el mismo en las 30 pantallas) — esas dos specs tienen medidas exactas verificadas. Para `01-auth`, `04-profile` y `05-users`, el `htmlCode.downloadUrl` que devuelve el MCP de Stitch para esas pantallas no correspondía a su propio contenido (bug/inconsistencia del lado de Stitch, confirmado bajando y comparando); esas specs están basadas en inspección visual de las capturas (sí verificadas correctas) más los tokens universales de color/tipografía/spacing, con `TODO` explícito en cada medida de layout puntual que no se pudo confirmar con certeza.
