# 02 — Listado de chats

Fuente: proyecto Stitch "Pulse Chat Design System" (`projects/9603869604031687512`), vía MCP. Este es el módulo con **mejor evidencia**: se bajó y leyó el HTML/CSS real (no solo la captura) de "Chats (Light)", y coincide con su título.

| Pantalla Stitch | Archivo |
|---|---|
| Chats (Light) | `chats-light.png` |
| Chats (Dark) | `chats-dark.png` |
| Chats - Empty State | `chats-empty-state.png` |
| Chats - Error State | `chats-error-state.png` |
| Chats - Skeleton Loading | `chats-skeleton-loading.png` |
| Chats - Offline Banner | `chats-offline-banner.png` |
| Chats - Empty Search Results | `chats-empty-search-results.png` |

## Medidas reales (leídas del HTML, no estimadas)

| Elemento | Valor real | Token en `tokens.ts` |
|---|---|---|
| Fila de chat — alto | `76px` | `sizes.chatRowHeight` |
| Fila de chat — padding horizontal | `margin` = `16px` | `spacing.lg` |
| Avatar | `52×52px` | `sizes.avatarListRow` |
| Punto de presencia (online) | `14×14px`, `bg-secondary-fixed-dim` = `#51DF8E`, ring 2px blanco | `sizes.statusDot` / `colors.success` |
| Punto de presencia (offline) | `bg-outline-variant` = `#C7C4D8` | `colors.offline` |
| Divisor entre filas | `1px`, `bg-surface-variant` = `#DBE2F9`, inset `left: 80px` (≈ avatar + margen) | `colors.border` / cálculo `avatarListRow + spacing.lg + spacing.md` |
| Nombre de contacto | `body-medium` (15px/500), `text-on-surface` | `typography.bodyMedium` + `colors.textPrimary` |
| Preview del último mensaje | `caption` (13px/400), `text-on-surface-variant` | `typography.caption` + `colors.textSecondary` |
| Timestamp | `timestamp` (11px/400), `text-outline` | `typography.timestamp` + `colors.textTertiary` |
| Badge de no leídos | pill, `bg-primary` (`#3525CD`), texto `on-primary`, min `20px` alto | `radii.pill` / `colors.primary` / `colors.onPrimary` |
| Search bar | alto `44px` (una variante) o `52px` (otra variante — hay inconsistencia entre 2 generaciones de esta pantalla), `bg-surface-container` (`#E9EDFF`), `rounded-xl` = `12px` | `sizes.controlHeight` / `colors.surfaceContainerLow`\* / `radii.control` |
| Filtros (chips "All/Unread/...") | pill, activo `bg-primary` + `on-primary`, inactivo `bg-surface-container` + `on-surface-variant` | **no implementado** — ver sección Alcance |
| FAB "nuevo chat" | `52×52px`, `bg-primary`, ícono `edit_square`, `right: 16px`, `bottom: 100px`, sombra `0 4px 16px rgba(53,37,205,0.35)` | `sizes.fab` / `colors.primary` / `sizes.fabOffsetBottom` / `shadows.light.fab`\*\* |
| Tab bar inferior | `83px` alto, 3 tabs (Chats/Users/Profile), activo `text-primary font-semibold`, inactivo `text-on-surface-variant` | implementado solo con 2 tabs (Chats/Profile) — ver Alcance |

\* Usamos `surfaceContainerLow` (`#F1F3FF`) en vez de `surfaceContainer` (`#E9EDFF`) para nuestro único input de búsqueda (en `new-chat.tsx`) para mantener consistencia con el resto de los inputs de formulario de la app (mismo token en todos lados) — es una simplificación consciente, no un valor sin fuente.

\** El color de sombra real del FAB en el HTML (`rgba(53,37,205,0.35)`, un violeta) es más específico que nuestro token genérico `shadows.light.fab` (gris `rgba(16,24,40,0.12)`, de la sección "Elevation" en prosa del design system). Quedó así por consistencia con el resto de sombras — **TODO**: si se quiere el 1:1 exacto, el FAB debería usar su propia sombra tinta del color primario.

## Estados de la pantalla (mapean 1 a 1 con nuestros componentes)

| Pantalla Stitch | Componente/estado en la app |
|---|---|
| Chats - Empty State | `EmptyState` (`src/components/StateView.tsx`) |
| Chats - Error State | `ErrorState` con `onRetry` |
| Chats - Skeleton Loading | Actualmente usamos un `ActivityIndicator` genérico (`LoadingState`), no un skeleton animado — **diferencia de implementación**, ver `docs/PROGRESS.md` |
| Chats - Offline Banner | **no implementado** — no hay detección de conectividad de red en la app (requeriría `@react-native-community/netinfo` o similar, fuera del alcance de este repintado) |
| Chats - Empty Search Results | Reutilizamos el mismo `EmptyState`, no hay una pantalla de "sin chats" vs "sin resultados de búsqueda" distinta (nuestro listado de chats no tiene buscador propio — el buscador vive en `new-chat.tsx`, sobre usuarios, no sobre chats existentes) |

## Alcance no implementado de este módulo

- **Filtros por chip** (All/Unread/Work/Direct/Channels en el mock): el backend no tiene el concepto de "chat con etiqueta" ni "no leído" — no hay dato que respalde estos filtros. No implementado.
- **Tab "Users" en el bottom nav**: el diseño real tiene 3 tabs. Confirma que el módulo de usuarios (`05-users`) es parte del flujo principal, no secundario — pendiente de construir esa pantalla y agregar el tab (cambio de navegación, no de estilo, fuera de este repintado).
- **Banner de offline / skeleton animado**: notados arriba, no implementados.
