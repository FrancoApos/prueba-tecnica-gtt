import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { router, Stack } from 'expo-router';
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
import { createUser } from '@/src/api/users';
import { FormTextInput } from '@/src/components/FormTextInput';
import { colors, radii, sizes, spacing, typography } from '@/src/theme/tokens';

const schema = z.object({
  email: z.string().min(1, 'Ingresá un email').email('Ingresá un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  firstName: z.string().min(1, 'Requerido'),
  lastName: z.string().min(1, 'Requerido'),
  birthDate: z
    .string()
    .min(1, 'Requerido')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato AAAA-MM-DD'),
  phone: z.string().min(6, 'Teléfono inválido'),
});

type FormValues = z.infer<typeof schema>;

/**
 * Alta de usuario desde la app — usa el mismo `POST /users` público que el
 * seed y Swagger (no hay un endpoint "admin" de alta distinto). Visible para
 * cualquier autenticado, no solo admins: crear una cuenta no es una acción
 * sobre "otro" usuario existente, es la misma que hoy ya es pública.
 */
export default function NewUserScreen() {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '', birthDate: '', phone: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await createUser(values);
      router.back();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'No pudimos crear el usuario');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Nuevo usuario', presentation: 'modal' }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <FormTextInput
                label="Email"
                placeholder="persona@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.email?.message}
                testID="new-user-email"
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <FormTextInput
                label="Contraseña"
                placeholder="Mínimo 8 caracteres"
                secureTextEntry
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.password?.message}
                testID="new-user-password"
              />
            )}
          />
          <Controller
            control={control}
            name="firstName"
            render={({ field }) => (
              <FormTextInput
                label="Nombre"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.firstName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="lastName"
            render={({ field }) => (
              <FormTextInput
                label="Apellido"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.lastName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="birthDate"
            render={({ field }) => (
              <FormTextInput
                label="Fecha de nacimiento"
                placeholder="AAAA-MM-DD"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.birthDate?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <FormTextInput
                label="Teléfono"
                placeholder="+5491122334455"
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.phone?.message}
                testID="new-user-phone"
              />
            )}
          />

          {serverError && (
            <View style={styles.serverError} testID="new-user-error">
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            testID="create-user-button"
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>Crear usuario</Text>
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
    padding: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  serverError: {
    backgroundColor: colors.errorContainer,
    borderRadius: radii.control,
    padding: spacing.sm,
  },
  serverErrorText: {
    ...typography.caption,
    color: colors.onErrorContainer,
  },
  button: {
    height: sizes.controlHeight,
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    ...typography.bodyMedium,
    color: colors.onPrimary,
  },
});
