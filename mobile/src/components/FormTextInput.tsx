import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors, radii, sizes, spacing, typography } from '@/src/theme/tokens';

interface FormTextInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function FormTextInput({ label, error, style, secureTextEntry, testID, ...inputProps }: FormTextInputProps) {
  const [visible, setVisible] = useState(false);
  const isPasswordField = !!secureTextEntry;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, isPasswordField && styles.inputWithToggle, error && styles.inputError, style]}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={isPasswordField && !visible}
          testID={testID}
          {...inputProps}
        />
        {isPasswordField && (
          <Pressable
            style={styles.toggle}
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            testID={testID ? `${testID}-toggle` : undefined}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>
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
  inputWrapper: {
    justifyContent: 'center',
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
  inputWithToggle: {
    paddingRight: sizes.iconButtonHitArea,
  },
  inputError: {
    borderColor: colors.error,
  },
  toggle: {
    position: 'absolute',
    right: spacing.md,
    height: sizes.controlHeight,
    justifyContent: 'center',
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
});
