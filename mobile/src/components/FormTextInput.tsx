import { useState, type ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors, radii, sizes, spacing, typography } from '@/src/theme/tokens';

interface FormTextInputProps extends TextInputProps {
  label: string;
  error?: string;
  /** Ícono adentro del campo, a la izquierda (sobre, candado…). */
  icon?: ComponentProps<typeof Ionicons>['name'];
}

export function FormTextInput({
  label,
  error,
  icon,
  style,
  secureTextEntry,
  testID,
  ...inputProps
}: FormTextInputProps) {
  const [visible, setVisible] = useState(false);
  const isPasswordField = !!secureTextEntry;
  // El slot de la derecha es uno solo: si el campo es de contraseña lo ocupa el
  // ojo (que hay que poder tocar incluso con el campo en error), y si no, el
  // aviso de error del diseño.
  const showErrorIcon = !!error && !isPasswordField;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        {icon && (
          // `pointerEvents="none"` para que tocar el ícono siga enfocando el
          // campo que tiene abajo, en vez de comerse el tap.
          <View style={styles.leadingSlot} pointerEvents="none">
            <Ionicons name={icon} size={20} color={error ? colors.error : colors.textTertiary} />
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            (isPasswordField || showErrorIcon) && styles.inputWithTrailing,
            error && styles.inputError,
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={isPasswordField && !visible}
          testID={testID}
          {...inputProps}
        />
        {isPasswordField && (
          <Pressable
            style={styles.trailingSlot}
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            testID={testID ? `${testID}-toggle` : undefined}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textTertiary} />
          </Pressable>
        )}
        {showErrorIcon && (
          <View style={styles.trailingSlot} pointerEvents="none">
            <Ionicons name="close-circle" size={20} color={colors.error} />
          </View>
        )}
      </View>
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
          <Text style={styles.error} testID={`${label}-error`}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

/** Ancho que ocupa un ícono dentro del campo: margen + ícono + aire hasta el texto. */
const ICON_SLOT_WIDTH = spacing.lg + 20 + spacing.sm;

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
  inputWithIcon: {
    paddingLeft: ICON_SLOT_WIDTH,
  },
  inputWithTrailing: {
    paddingRight: sizes.iconButtonHitArea,
  },
  inputError: {
    borderColor: colors.error,
  },
  leadingSlot: {
    position: 'absolute',
    left: spacing.lg,
    height: sizes.controlHeight,
    justifyContent: 'center',
  },
  trailingSlot: {
    position: 'absolute',
    right: spacing.md,
    height: sizes.controlHeight,
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    flex: 1,
  },
});
