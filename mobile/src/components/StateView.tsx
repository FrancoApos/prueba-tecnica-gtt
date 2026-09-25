import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/src/theme';

interface StateViewProps {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function LoadingState({ label = 'Cargando...' }: { label?: string }) {
  return (
    <View style={styles.container} testID="loading-state">
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.description}>{label}</Text>
    </View>
  );
}

export function ErrorState({ title, description, onRetry, retryLabel = 'Reintentar' }: StateViewProps) {
  return (
    <View style={styles.container} testID="error-state">
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {onRetry && (
        <Pressable style={styles.retryButton} onPress={onRetry} testID="retry-button">
          <Text style={styles.retryText}>{retryLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({ title, description }: StateViewProps) {
  return (
    <View style={styles.container} testID="empty-state">
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
  },
  retryText: {
    color: colors.primaryText,
    fontWeight: '600',
  },
});
