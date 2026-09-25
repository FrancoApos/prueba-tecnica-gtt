# 03 — Conversación

Fuente: proyecto Stitch "Pulse Chat Design System" (`projects/9603869604031687512`), vía MCP. Se bajó y leyó el HTML/CSS real de una de estas pantallas (contenido de conversación confirmado, aunque catalogada "(Light)" el body traía estilos inline forzando dark — se usó igual como evidencia real de **dark mode**, ver nota de método más abajo).

| Pantalla Stitch | Archivo |
|---|---|
| Conversation Thread (Light) | `conversation-thread-light.png` |
| Conversation Thread (Dark) | `conversation-thread-dark.png` |
| Conversation - Empty Thread | `conversation-empty-thread.png` |
| Conversation - Attachments (Light) | `conversation-attachments-light.png` |
| Conversation - Attachments (Dark) | `conversation-attachments-dark.png` |
| Conversation - Attachment Picker Open (Light) | `conversation-attachment-picker-light.png` |
| Conversation - Attachment Picker Open (Dark) | `conversation-attachment-picker-dark.png` |

> **Nota de método:** el archivo HTML descargado desde el campo `htmlCode.downloadUrl` de la pantalla "Conversation Thread (Light)" renderiza en **dark** (el `<body>` interno tiene `style="background-color: #0F1115; color: #F2F4F7"` que pisa las clases Tailwind `bg-surface` de fondo claro). Es una inconsistencia del lado de Stitch, no un error nuestro. Se aprovechó igual: da valores reales y precisos de **dark mode** (que la sección en prosa del design system también documentaba, así que se usó con confianza — ver `src/theme/tokens.ts`).

## Medidas y colores reales (leídos del HTML, dark mode)

| Elemento | Valor real |
|---|---|
| Header | alto `56px`, `background-color: #0F1115`, `border-bottom: 1px solid #262B36` |
| Botón "volver" / "más opciones" | `44×44px` (target táctil) |
| Avatar en header | `36×36px` |
| Punto de presencia en header | `9px`, `#32D583`, borde `2px solid #0F1115` |
| Nombre de contacto en header | **16px / 600**, `#F2F4F7` — no coincide con ninguno de los 7 tokens tipográficos del design system (todos ≤13px o =20px); se agregó como token nuevo `typography.conversationHeaderName` |
| Texto "Online" bajo el nombre | 12px/400, `#32D583`, con un puntito `6px` pulsante del mismo color |
| Separador de día ("YESTERDAY"/"TODAY") | 11px/600 uppercase, `#667085` |
| Bubble recibida | `background-color: #171A21`, `border: 1px solid #262B36`, `border-radius: 18px 18px 18px 4px` (esquina inferior-izquierda achicada) |
| Bubble recibida — mensaje "del medio" de un grupo consecutivo | `border-radius: 18px` (las 4 esquinas completas, sin "cola") |
| Bubble enviada | `background-color: #6366F1`, `border-radius: 18px 18px 4px 18px` (esquina inferior-derecha achicada) |
| Texto dentro de la bubble | 15px/400 |
| Timestamp dentro de bubble recibida | 11px/400, `#667085` |
| Timestamp dentro de bubble enviada | 11px/400, `rgba(255,255,255,0.7)` |
| Doble check (leído) | ícono SVG, solo en mensajes enviados — **no implementado**, ver Alcance |
| Composer — contenedor | `padding: 12px`, `padding-bottom: 24px`, `background-color: #0F1115`, `border-top: 1px solid #262B36`, sombra `0 -2px 10px rgba(0,0,0,0.3)` |
| Botón adjuntar | círculo `40×40px`, `background-color: #171A21`, ícono `20px` color `#98A2B3` |
| Input de mensaje | `flex-1`, `min-height: 44px`, `border-radius: full` (pill), `background-color: #171A21`, `border: 1px solid #262B36`, padding horizontal `16px` |
| Botón enviar | círculo `40×40px`, `background-color: #6366F1`, ícono blanco |

Todos estos valores están en `src/theme/tokens.ts` (`palette.dark`, `typography.conversationHeaderName`, `sizes.avatarConversationHeader`, `sizes.sendButton`, `shadows.dark.composer`).

## Tokens aplicados (light, la app no tiene dark mode wireado — ver README de mobile)

| Elemento | Token |
|---|---|
| Bubble enviada | `colors.primaryContainer` / `colors.onPrimary` |
| Bubble recibida | `colors.surfaceContainerLow` / `colors.textPrimary` / borde `colors.border` |
| Radio de bubble / cola | `radii.bubble` (18) / `radii.bubbleTail` (4) |
| Input del composer | `radii.pill`, `colors.border`, `colors.background` |
| Botón enviar / adjuntar | `sizes.sendButton`, `radii.pill`, `colors.primaryContainer` / `colors.surfaceContainerLow` |

## Alcance no implementado de este módulo

- **Doble check / recibos de lectura**: el mock muestra un ícono de "leído" en los mensajes enviados. El backend no tiene ningún campo de estado de lectura por mensaje (`docs/DATA_MODEL.md` ya lo señala como posible extensión: `readBy: ObjectId[]`). No implementado — requeriría cambios de modelo de datos y lógica, no solo estilo.
- **Separadores de día** ("YESTERDAY"/"TODAY") en el historial: no implementado — el `FlatList` de mensajes no agrupa por fecha. Mejora de UX pendiente, no bloqueante.
- **Botón de llamada de voz** (visible en la variante "Conversation - Empty Thread"): no pedido por la consigna, no implementado.
- **Preview antes de enviar un adjunto**: en la app, elegir una foto/archivo lo envía directo (con el texto que haya en el campo en ese momento); el mock no muestra explícitamente un paso de previsualización tampoco, así que esto coincide.
