import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { UserSortField } from '@/src/api/users';
import { colors, overlays, radii, spacing, typography } from '@/src/theme/tokens';

export type UsersSortKey = 'nameAsc' | 'nameDesc' | 'recentlyActive' | 'newest';

interface SortOption {
  key: UsersSortKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  sortBy: UserSortField;
  sortOrder: 'asc' | 'desc';
}

/**
 * Las cuatro opciones del mock (`docs/design/05-users/SPEC.md`, "Sort by").
 * Cada una es un par `sortBy`/`sortOrder` de los que ya acepta el backend
 * (`SORTABLE_FIELDS` en `QueryUsersDto`) — acá no hay orden del lado del
 * cliente: se re-pide la página 1 al server con los params nuevos.
 */
export const USERS_SORT_OPTIONS: readonly SortOption[] = [
  { key: 'nameAsc', label: 'Nombre A–Z', icon: 'arrow-down-outline', sortBy: 'lastName', sortOrder: 'asc' },
  { key: 'nameDesc', label: 'Nombre Z–A', icon: 'arrow-up-outline', sortBy: 'lastName', sortOrder: 'desc' },
  { key: 'recentlyActive', label: 'Actividad reciente', icon: 'time-outline', sortBy: 'lastSeenAt', sortOrder: 'desc' },
  { key: 'newest', label: 'Más recientes primero', icon: 'sparkles-outline', sortBy: 'createdAt', sortOrder: 'desc' },
];

/** Coincide con el default del backend (`lastName` asc), así el primer render no reordena nada. */
export const DEFAULT_USERS_SORT: UsersSortKey = 'nameAsc';

export function usersSortQuery(key: UsersSortKey): { sortBy: UserSortField; sortOrder: 'asc' | 'desc' } {
  const option = USERS_SORT_OPTIONS.find((o) => o.key === key) ?? USERS_SORT_OPTIONS[0];
  return { sortBy: option.sortBy, sortOrder: option.sortOrder };
}

export function usersSortLabel(key: UsersSortKey): string {
  return (USERS_SORT_OPTIONS.find((o) => o.key === key) ?? USERS_SORT_OPTIONS[0]).label;
}

interface UsersSortSheetProps {
  visible: boolean;
  /** El orden aplicado hoy — es lo que queda seleccionado al abrir la hoja. */
  value: UsersSortKey;
  onApply: (key: UsersSortKey) => void;
  onClose: () => void;
}

/**
 * Hoja modal de ordenamiento del directorio de usuarios.
 *
 * La selección es **en borrador**: tocar una opción no reordena nada hasta
 * "Aplicar orden", igual que en el mock (que tiene Cancel/Apply al pie). Por
 * eso el estado vive acá y no en la pantalla; se resetea al valor aplicado en
 * cada apertura (`onShow`), así cancelar y volver a abrir no arrastra lo que
 * se había tocado la vez anterior.
 */
export function UsersSortSheet({ visible, value, onApply, onClose }: UsersSortSheetProps) {
  const [draft, setDraft] = useState<UsersSortKey>(value);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setDraft(value)}
    >
      {/* Tocar el fondo cierra sin aplicar, como cualquier action sheet. */}
      <Pressable style={styles.backdrop} onPress={onClose} testID="users-sort-backdrop" />

      <View style={styles.sheet}>
        <View style={styles.grabber} />

        <View style={styles.header}>
          <Text style={styles.title}>Ordenar por</Text>
          <Pressable onPress={onClose} hitSlop={12} testID="users-sort-close">
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        {USERS_SORT_OPTIONS.map((option, index) => {
          const selected = option.key === draft;
          return (
            <Pressable
              key={option.key}
              style={[styles.option, index > 0 && styles.optionDivider, selected && styles.optionSelected]}
              onPress={() => setDraft(option.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              testID={`users-sort-option-${option.key}`}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={selected ? colors.primary : colors.textTertiary}
              />
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Text>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
            </Pressable>
          );
        })}

        <View style={styles.footer}>
          <Pressable style={[styles.button, styles.buttonSecondary]} onPress={onClose} testID="users-sort-cancel">
            <Text style={styles.buttonSecondaryLabel}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.buttonPrimary]}
            onPress={() => onApply(draft)}
            testID="users-sort-apply"
          >
            <Text style={styles.buttonPrimaryLabel}>Aplicar orden</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: overlays.backdrop,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.control,
    borderTopRightRadius: radii.control,
    paddingBottom: spacing.xl,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    marginTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.titleScreen,
    color: colors.primary,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  optionSelected: {
    backgroundColor: colors.surfaceContainerLow,
  },
  optionLabel: {
    ...typography.bodyDefault,
    // El mock pinta todas las etiquetas en el índigo de marca; acá la no
    // seleccionada va en el color de texto normal, que es lo que hace el resto
    // de la app y se lee mejor. La seleccionada sí toma el acento.
    color: colors.textPrimary,
    flex: 1,
  },
  optionLabelSelected: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: colors.surfaceContainerLow,
  },
  buttonSecondaryLabel: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  buttonPrimary: {
    backgroundColor: colors.primaryContainer,
  },
  buttonPrimaryLabel: {
    ...typography.bodyMedium,
    color: colors.onPrimary,
  },
});
