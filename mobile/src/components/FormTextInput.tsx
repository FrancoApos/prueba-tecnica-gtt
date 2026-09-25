import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors, radii, sizes, spacing, typography } from '@/src/theme/tokens';

interface FormTextInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function FormTextInput({ label, error, style, ...inputProps }: FormTextInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.textTertiary}
        {...inputProps}
      />
      {error && (
        <Text style={styles.error} testID={`${label}-error`}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.sectionLabel,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
  input: {
    height: sizes.controlHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing.lg,
    ...typography.bodyDefault,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceContainerLow,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
});
