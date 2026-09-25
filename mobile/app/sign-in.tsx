import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { colors, radius, spacing } from '@/src/theme';

const schema = z.object({
  email: z.string().min(1, 'Ingresá tu email').email('Ingresá un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const login = useSessionStore((s) => s.login);
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
        <View style={styles.header}>
          <Text style={styles.title}>Chat App</Text>
          <Text style={styles.subtitle}>Iniciá sesión para ver tus conversaciones</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <FormTextInput
                label="Email"
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
                placeholder="••••••••"
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
            <View style={styles.serverError} testID="login-error">
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            testID="submit-button"
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
  },
  form: {
    gap: spacing.md,
  },
  serverError: {
    backgroundColor: colors.dangerBackground,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  serverErrorText: {
    color: colors.danger,
    fontSize: 14,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontWeight: '600',
  },
});
