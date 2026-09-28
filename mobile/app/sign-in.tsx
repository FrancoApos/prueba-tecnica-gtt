import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';
import { ApiError } from '@/src/api/client';
import { FormTextInput } from '@/src/components/FormTextInput';
import { useSessionStore } from '@/src/store/session';
import { colors, radii, shadows, sizes, spacing, typography } from '@/src/theme/tokens';

/**
 * El largo mínimo de la contraseña se valida en el alta de cuenta, no acá: en
 * login, rechazar por largo le dice a quien intenta entrar que el problema es
 * el formato y no la credencial. Espeja a `LoginDto` del backend.
 */
const schema = z.object({
  email: z.string().min(1, 'Ingresá tu email').email('Ingresá un email válido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const login = useSessionStore((s) => s.login);
  const sessionExpiredMessage = useSessionStore((s) => s.sessionExpiredMessage);
  const clearSessionExpiredMessage = useSessionStore((s) => s.clearSessionExpiredMessage);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    clearSessionExpiredMessage();
    try {
      await login(values.email, values.password);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.statusCode === 401 ? 'Email o contraseña incorrectos' : err.message);
      } else {
        setServerError('Ocurrió un error inesperado. Intentá de nuevo.');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logo}>
              <Ionicons name="chatbubbles" size={34} color={colors.onPrimary} />
            </View>
            <Text style={styles.title}>Chat App</Text>
            <Text style={styles.subtitle}>Iniciá sesión para ver tus conversaciones</Text>
          </View>

          <View style={styles.form}>
            {sessionExpiredMessage && (
              <AlertBanner
                text={sessionExpiredMessage}
                onDismiss={clearSessionExpiredMessage}
                testID="session-expired-message"
              />
            )}

            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <FormTextInput
                  label="Email"
                  icon="mail-outline"
                  placeholder="ana@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.email?.message}
                  testID="email-input"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <FormTextInput
                  label="Contraseña"
                  icon="lock-closed-outline"
                  placeholder="Tu contraseña"
                  secureTextEntry
                  autoComplete="password"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.password?.message}
                  testID="password-input"
                />
              )}
            />

            {serverError && (
              <AlertBanner text={serverError} onDismiss={() => setServerError(null)} testID="login-error" />
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              testID="submit-button"
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <>
                  <Text style={styles.buttonText}>Ingresar</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
                </>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Aviso de error "de pantalla" (credenciales rechazadas, sesión vencida), a
 * diferencia del error por campo que ya muestra `FormTextInput`. Se puede
 * cerrar: si no, el cartel de sesión vencida queda arriba del formulario hasta
 * que el próximo submit lo limpie.
 */
function AlertBanner({
  text,
  onDismiss,
  testID,
}: {
  text: string;
  onDismiss: () => void;
  testID: string;
}) {
  return (
    <View style={styles.banner} testID={testID}>
      <Ionicons name="alert-circle" size={18} color={colors.onErrorContainer} />
      <Text style={styles.bannerText}>{text}</Text>
      <Pressable
        onPress={onDismiss}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Descartar aviso"
        testID={`${testID}-dismiss`}
      >
        <Ionicons name="close" size={18} color={colors.onErrorContainer} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  /** Ancho acotado: en tablet y en el target web el formulario no tiene por qué
   * estirarse a lo ancho de toda la pantalla. */
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    width: sizes.authLogo,
    height: sizes.authLogo,
    borderRadius: radii.bubble,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.light.fab,
  },
  title: {
    ...typography.titleAuth,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodyDefault,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  form: {
    gap: spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderRadius: radii.control,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bannerText: {
    ...typography.caption,
    color: colors.onErrorContainer,
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: sizes.controlHeight,
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.control,
    marginTop: spacing.xs,
    ...shadows.light.fab,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography.bodyMedium,
    color: colors.onPrimary,
  },
});
