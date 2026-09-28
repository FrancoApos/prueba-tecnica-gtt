/**
 * Design tokens extraídos del design system de Stitch "Pulse Chat"
 * (proyecto `projects/9603869604031687512`, asset
 * `assets/629e50abbd14456c88864c49dcaedbd7`) vía MCP.
 *
 * Fuente: el objeto `tailwind.config.theme.colors` embebido —idéntico— en el
 * HTML real de las pantallas generadas (Chats, Conversación, y variantes),
 * bajado y leído directamente (no la descripción en prosa del design system,
 * que en algunos casos no coincide con lo efectivamente renderizado — ej. la
 * prosa dice que los botones usan `#4F46E5`, y ese valor SÍ aparece, pero
 * como `primary-container`, no como `primary`; `primary` en el HTML real es
 * `#3525CD`, un tono más oscuro reservado para íconos/badges/tab activo).
 *
 * Dark mode: no viene en el bloque de tokens M3 de arriba (ese es solo
 * light), se tomó de los estilos inline reales de la pantalla de
 * conversación (que pese a estar catalogada "(Light)" renderiza en dark —
 * inconsistencia del lado de Stitch, no nuestra) y coincide con la sección
 * "Dark Theme" de la prosa, así que se usa con confianza.
 *
 * Detalle completo y capturas por módulo: docs/design/*\/SPEC.md.
 */

export const palette = {
  light: {
    background: '#F9F9FF',
    /** Superficies "elevadas" planas: headers, footers, chips de sugerencia. */
    surface: '#FFFFFF',
    /** Superficies "contenedor": chips, search bar, filtros. */
    surfaceContainer: '#E9EDFF',
    /** Un tono más sutil: hover de filas, fill de bubbles recibidas. */
    surfaceContainerLow: '#F1F3FF',
    /** Líneas divisoras (no confundir con `outline`, que es texto/ícono). */
    border: '#DBE2F9',
    textPrimary: '#141B2C',
    textSecondary: '#464555',
    /** Timestamps, placeholders, íconos apagados. */
    textTertiary: '#777587',
    /** Acento chico: íconos, badges, tab activo, FAB. */
    primary: '#3525CD',
    /** Acento "grande": fill de botones CTA y burbujas propias. */
    primaryContainer: '#4F46E5',
    onPrimary: '#FFFFFF',
    /** Punto de presencia "online". */
    success: '#51DF8E',
    /** TODO(design): sin valor "offline" explícito en Stitch — se reutiliza
     * `outline-variant`, un gris neutro ya definido por el sistema. */
    offline: '#C7C4D8',
    error: '#BA1A1A',
    errorContainer: '#FFDAD6',
    onErrorContainer: '#93000A',
    successContainer: '#70FDA7',
    onSuccessContainer: '#007440',
  },
  dark: {
    background: '#0F1115',
    surface: '#171A21',
    surfaceContainer: '#171A21',
    surfaceContainerLow: '#171A21',
    border: '#262B36',
    textPrimary: '#F2F4F7',
    textSecondary: '#98A2B3',
    textTertiary: '#667085',
    primary: '#6366F1',
    primaryContainer: '#6366F1',
    onPrimary: '#FFFFFF',
    success: '#32D583',
    /** TODO(design): sin valor "offline" explícito para dark tampoco. */
    offline: '#464555',
    error: '#F97066',
    /** TODO(design): Stitch no define contenedores de error/success para dark
     * mode en ninguna capa. Se componen con `surface` + el color de acento,
     * sin tinte propio, hasta tener una spec real. */
    errorContainer: '#171A21',
    onErrorContainer: '#F97066',
    successContainer: '#171A21',
    onSuccessContainer: '#32D583',
  },
} as const;

/**
 * fontWeight como string porque así lo tipa React Native (TextStyle).
 * letterSpacing convertido de `em` (spec de Stitch) a puntos: em * fontSize.
 */
/**
 * `fontFamily` apunta al nombre exacto que registra `useFonts` en
 * app/_layout.tsx (@expo-google-fonts/inter, ej. "Inter_600SemiBold") en vez
 * de "Inter" + `fontWeight` separado: son fuentes estáticas (no variables),
 * cada archivo YA es ese peso — pedirle a RN un `fontWeight` distinto al del
 * archivo cargado puede causar un bold sintético o, en iOS, que no encuentre
 * la variante y caiga al font del sistema.
 */
export const typography = {
  titleScreen: { fontFamily: 'Inter_600SemiBold', fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  bodyDefault: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, letterSpacing: -0.075 },
  bodyMedium: { fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 22, letterSpacing: -0.075 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  captionMedium: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  sectionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 16, letterSpacing: 1.04 },
  timestamp: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 14, letterSpacing: 0.11 },
  /** Fuera de la escala de 7 tokens del design system: tamaño específico
   * observado en el header de la pantalla de Conversación real (16px/600). */
  conversationHeaderName: { fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 20, letterSpacing: 0 },
  /** También fuera de la escala: el nombre de producto en la pantalla de
   * Sign In se ve bastante más grande que `titleScreen` (que es el título de
   * las pantallas internas). Medido sobre la captura de Stitch
   * (docs/design/01-auth/sign-in-default-light.png), no sobre HTML — el MCP no
   * devuelve el markup correcto de este módulo, ver el SPEC. */
  titleAuth: { fontFamily: 'Inter_600SemiBold', fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
} as const;

/** Grid de 4pt de Stitch (`space-xs`…`space-xl`). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/**
 * Radios funcionales tal como los aplica Stitch por componente, leídos del
 * HTML real (bubbles: `border-radius: 18px 18px 18px 4px` / `...4px 18px`)
 * y del `tailwind.config.borderRadius` embebido (chips/pills: `rounded-full`).
 */
export const radii = {
  /** Inputs, botones, cards, search bar, hojas modales. */
  control: 12,
  /** Bubbles de mensaje. */
  bubble: 18,
  /** Esquina "cola" de la bubble, del lado del emisor/receptor. */
  bubbleTail: 4,
  /** Avatares, badges, chips, FAB, pill de presencia. */
  pill: 9999,
} as const;

/**
 * Medidas de componente específicas leídas directamente del HTML real
 * (no de la prosa, que da valores ligeramente distintos p.ej. 72px de fila
 * en vez de los 76px reales).
 */
export const sizes = {
  avatarListRow: 52,
  avatarConversationHeader: 36,
  /** Filas de la pantalla "Nuevo chat" — no hay una pantalla de Stitch para
   * este flujo específico; se usa el tamaño de avatar "header" que la prosa
   * documenta para contextos secundarios de lista (40px). */
  avatarSearchRow: 40,
  avatarProfile: 72,
  statusDot: 14,
  chatRowHeight: 76,
  controlHeight: 52,
  iconButtonHitArea: 44,
  sendButton: 40,
  fab: 52,
  /** Offset inferior del FAB de "nuevo chat" (`bottom-[100px]` en el HTML real de Stitch — despeja el tab bar). */
  fabOffsetBottom: 100,
  /** Marca de la app arriba del formulario de Sign In. */
  authLogo: 72,
} as const;

/**
 * Sombras de la sección "Elevation & Depth" + valores reales observados en
 * el composer de la pantalla de Conversación (dark). RN no soporta
 * box-shadow CSS directo: se traduce a shadowColor/Offset/Opacity/Radius
 * (iOS) + elevation (Android, aproximado — Stitch no da un valor explícito).
 */
export const shadows = {
  light: {
    /** No hay un FAB en la app todavía — token disponible para cuando se use. */
    fab: {
      shadowColor: '#101828',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    composer: {
      shadowColor: '#101828',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
  },
  dark: {
    fab: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 6,
    },
    /** Valor real observado (composer de la pantalla de Conversación dark):
     * `box-shadow: 0 -2px 10px rgba(0,0,0,0.3)`. */
    composer: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 2,
    },
  },
} as const;

/** Overlays (fondo de modales/action sheets). Un solo valor en la spec de Stitch, sin distinción por modo. */
export const overlays = {
  backdrop: 'rgba(15, 17, 21, 0.6)',
} as const;

/**
 * La app no tiene todavía un mecanismo de cambio de tema (requeriría lógica
 * nueva en app/_layout.tsx, fuera del alcance de este repintado de estilos)
 * — todos los componentes consumen `colors` (= `palette.light`) por ahora.
 * `palette.dark` queda listo para cuando se decida wirear dark mode.
 */
export const colors = palette.light;
