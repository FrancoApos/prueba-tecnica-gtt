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
  Switch,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';
import { deleteUser, updateUser } from '@/src/api/users';
import { ApiError } from '@/src/api/client';
import { Avatar } from '@/src/components/Avatar';
import { FormTextInput } from '@/src/components/FormTextInput';
import { useSessionStore } from '@/src/store/session';
import { showChoice } from '@/src/utils/alert';
import { colors, radii, sizes, spacing, typography } from '@/src/theme/tokens';
import { birthDateField, DATE_FORMAT_HINT, toApiDate, toDisplayDate } from '@/src/utils/date';
import { formatRelativeTimestamp } from '@/src/utils/format';

const schema = z.object({
  firstName: z.string().min(1, 'Requerido'),
  lastName: z.string().min(1, 'Requerido'),
  birthDate: birthDateField,
  phone: z.string().min(6, 'Teléfono inválido'),
  /**
   * El backend guarda una URL (`@IsUrl()`), no un archivo: no hay endpoint de
   * subida de avatar, así que el campo es la URL de la foto. Vacío es válido
   * y significa "sin foto" — ver `onSubmit`, que lo traduce a `null`.
   */
  avatarUrl: z
    .string()
    .trim()
    .refine((value) => value === '' || /^https?:\/\/\S+$/i.test(value), {
      message: 'Tiene que ser una URL que empiece con http:// o https://',
    }),
});

type FormValues = z.infer<typeof schema>;

export default function ProfileScreen() {
  const user = useSessionStore((s) => s.user);
  const updateSessionUser = useSessionStore((s) => s.updateUser);
  const logout = useSessionStore((s) => s.logout);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      birthDate: user ? toDisplayDate(user.birthDate) : '',
      phone: user?.phone ?? '',
      avatarUrl: user?.avatarUrl ?? '',
    },
  });

  if (!user) {
    return null;
  }

  const onSubmit = async (values: FormValues) => {
    setFeedback(null);
    try {
      const updated = await updateUser(user.id, {
        ...values,
        birthDate: toApiDate(values.birthDate),
        // Vacío es "quitar la foto": el backend distingue `null` (borrar) de
        // omitir la clave (no tocar), y `''` no pasaría el `@IsUrl()`.
        avatarUrl: values.avatarUrl === '' ? null : values.avatarUrl,
      });
      updateSessionUser(updated);
      setFeedback({ type: 'success', text: 'Perfil actualizado' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'No pudimos guardar los cambios',
      });
    }
  };

  const toggleStatus = async () => {
    setTogglingStatus(true);
    try {
      const updated = await updateUser(user.id, { status: user.status === 'online' ? 'offline' : 'online' });
      updateSessionUser(updated);
    } catch {
      setFeedback({ type: 'error', text: 'No pudimos cambiar tu estado de conexión' });
    } finally {
      setTogglingStatus(false);
    }
  };

  const confirmDeleteAccount = () => {
    // `showChoice` y no `Alert.alert` directo: el Alert de react-native-web es
    // un no-op, así que en el browser este botón no hacía absolutamente nada
    // (ver `src/utils/alert.web.ts`). El "Cancelar" lo agrega el helper.
    showChoice(
      'Eliminar cuenta',
      'Esta acción no se puede deshacer. ¿Eliminar tu cuenta definitivamente?',
      [{ label: 'Eliminar', style: 'destructive', onPress: () => void handleDeleteAccount() }],
    );
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteUser(user.id);
      await logout();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'No pudimos eliminar tu cuenta',
      });
      setDeleting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Avatar firstName={user.firstName} lastName={user.lastName} avatarUrl={user.avatarUrl} size={sizes.avatarProfile} />
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusLabel}>Estado de conexión</Text>
            <Text style={styles.statusValue}>{user.status === 'online' ? 'En línea' : 'Desconectado'}</Text>
          </View>
          {togglingStatus ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={user.status === 'online'}
              onValueChange={toggleStatus}
              trackColor={{ true: colors.primary }}
              testID="status-switch"
            />
          )}
        </View>

        <Text style={styles.lastSeen} testID="last-seen">
          Última conexión: {user.lastSeenAt ? formatRelativeTimestamp(user.lastSeenAt) : 'Nunca'}
        </Text>

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
          <Controller
            control={control}
            name="avatarUrl"
            render={({ field }) => (
              <FormTextInput
                label="Foto de perfil (URL)"
                placeholder="https://… — vacío para quitarla"
                autoCapitalize="none"
                keyboardType="url"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.avatarUrl?.message}
                testID="avatar-url-input"
              />
            )}
          />

          {feedback && (
            <View style={[styles.feedback, feedback.type === 'error' && styles.feedbackError]}>
              <Text style={[styles.feedbackText, feedback.type === 'error' && styles.feedbackTextError]}>
                {feedback.text}
              </Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            testID="save-profile-button"
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>Guardar cambios</Text>
            )}
          </Pressable>

          <Pressable style={styles.logoutButton} onPress={() => logout()} testID="logout-button">
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>

          <Pressable
            style={styles.deleteButton}
            onPress={confirmDeleteAccount}
            disabled={deleting}
            testID="delete-account-button"
          >
            {deleting ? (
              <ActivityIndicator color={colors.error} size="small" />
            ) : (
              <Text style={styles.deleteText}>Eliminar cuenta</Text>
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.control,
    padding: spacing.md,
  },
  lastSeen: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  statusLabel: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  statusValue: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  form: {
    gap: spacing.md,
  },
  feedback: {
    backgroundColor: colors.successContainer,
    borderRadius: radii.control,
    padding: spacing.sm,
  },
  feedbackError: {
    backgroundColor: colors.errorContainer,
  },
  feedbackText: {
    ...typography.caption,
    color: colors.onSuccessContainer,
  },
  feedbackTextError: {
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
  logoutButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  logoutText: {
    ...typography.bodyMedium,
    color: colors.error,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  deleteText: {
    ...typography.caption,
    color: colors.error,
  },
});
