import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { router, Stack, useLocalSearchParams } from 'expo-router';
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
import { getUser, updateUser } from '@/src/api/users';
import { Avatar } from '@/src/components/Avatar';
import { FormTextInput } from '@/src/components/FormTextInput';
import { ErrorState, LoadingState } from '@/src/components/StateView';
import { colors, radii, sizes, spacing, typography } from '@/src/theme/tokens';
import type { User } from '@/src/types/api';
import { birthDateField, DATE_FORMAT_HINT, toApiDate, toDisplayDate } from '@/src/utils/date';

const schema = z.object({
  firstName: z.string().min(1, 'Requerido'),
  lastName: z.string().min(1, 'Requerido'),
  birthDate: birthDateField,
  phone: z.string().min(6, 'Teléfono inválido'),
});

type FormValues = z.infer<typeof schema>;

/**
 * Editar la cuenta de OTRO usuario — solo llega acá quien la app le muestra
 * el ícono de editar en el directorio (rol admin), pero la autorización real
 * la exige el backend (RolesGuard): si alguien entra igual sin ser admin, el
 * PATCH devuelve 403 y se muestra como cualquier otro error de servidor.
 */
export default function EditUserScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', birthDate: '', phone: '' },
  });

  const loadUser = useCallback(() => {
    setLoadError(null);
    getUser(userId)
      .then((fetched) => {
        setUser(fetched);
        reset({
          firstName: fetched.firstName,
          lastName: fetched.lastName,
          birthDate: toDisplayDate(fetched.birthDate),
          phone: fetched.phone,
        });
      })
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : 'No pudimos cargar este usuario');
      });
  }, [userId, reset]);

  useEffect(() => {
    // Patrón estándar de data fetching en un efecto; ver nota en useMessages.ts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUser();
  }, [loadUser]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await updateUser(userId, { ...values, birthDate: toApiDate(values.birthDate) });
      router.back();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'No pudimos guardar los cambios');
    }
  };

  if (loadError) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Editar usuario' }} />
        <ErrorState title="No pudimos cargar este usuario" description={loadError} onRetry={loadUser} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Editar usuario' }} />
        <LoadingState label="Cargando usuario..." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Editar usuario' }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Avatar firstName={user.firstName} lastName={user.lastName} avatarUrl={user.avatarUrl} size={sizes.avatarProfile} />
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.form}>
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
                placeholder={DATE_FORMAT_HINT}
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
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.phone?.message}
              />
            )}
          />

          {serverError && (
            <View style={styles.serverError} testID="edit-user-error">
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            testID="save-user-button"
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>Guardar cambios</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  email: {
    ...typography.caption,
    color: colors.textTertiary,
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
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    ...typography.bodyMedium,
    color: colors.onPrimary,
  },
});
