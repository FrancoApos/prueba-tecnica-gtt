import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors, radius, spacing } from '@/src/theme';

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
        placeholderTextColor={colors.textMuted}
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
  },
});
