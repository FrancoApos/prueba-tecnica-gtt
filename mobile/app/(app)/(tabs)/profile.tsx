import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
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
import { deleteAvatar, deleteUser, updateUser, uploadAvatar } from '@/src/api/users';
import { ApiError } from '@/src/api/client';
import { Avatar } from '@/src/components/Avatar';
import { FormTextInput } from '@/src/components/FormTextInput';
import { useSessionStore } from '@/src/store/session';
import { showAlert, showChoice } from '@/src/utils/alert';
import { colors, overlays, radii, sizes, spacing, typography } from '@/src/theme/tokens';
import { birthDateField, DATE_FORMAT_HINT, toApiDate, toDisplayDate } from '@/src/utils/date';
import { formatRelativeTimestamp } from '@/src/utils/format';

const schema = z.object({
  firstName: z.string().min(1, 'Requerido'),
  lastName: z.string().min(1, 'Requerido'),
  birthDate: birthDateField,
  phone: z.string().min(6, 'Teléfono inválido'),
  // La foto no es parte del formulario: se sube como archivo apenas se elige,
  // con su propio endpoint (`POST /users/:id/avatar`), sin pasar por "Guardar
  // cambios". Ver `handlePickAvatar`.
});

type FormValues = z.infer<typeof schema>;

export default function ProfileScreen() {
  const user = useSessionStore((s) => s.user);
  const updateSessionUser = useSessionStore((s) => s.updateUser);
  const logout = useSessionStore((s) => s.logout);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

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

  /**
   * La foto se sube apenas se elige, no al tocar "Guardar cambios": es un
   * archivo con su propio endpoint, no un campo del formulario, y esperar al
   * submit obligaría a sostener la imagen elegida en memoria sin necesidad.
   */
  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permiso necesario', 'Necesitamos acceso a tus fotos para cambiar tu foto de perfil.');
      return;
    }
    // Recorte cuadrado: el avatar se dibuja circular, así que si no se recorta
    // una foto apaisada se muestra centrada y cortada por el borde. `quality`
    // menor a 1 además fuerza el reencodeo a JPEG en iOS, que es lo que evita
    // que llegue un HEIC (el backend solo acepta png/jpeg/webp).
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    setFeedback(null);
    setAvatarBusy(true);
    try {
      const updated = await uploadAvatar(user.id, {
        uri: asset.uri,
        name: asset.fileName ?? 'foto-de-perfil.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
      });
      updateSessionUser(updated);
      setFeedback({ type: 'success', text: 'Foto de perfil actualizada' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'No pudimos subir la foto',
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setFeedback(null);
    setAvatarBusy(true);
    try {
      updateSessionUser(await deleteAvatar(user.id));
      setFeedback({ type: 'success', text: 'Foto de perfil quitada' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof ApiError ? err.message : 'No pudimos quitar la foto',
      });
    } finally {
      setAvatarBusy(false);
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
          <Pressable
            onPress={() => void handlePickAvatar()}
            disabled={avatarBusy}
            accessibilityRole="button"
            accessibilityLabel={user.avatarUrl ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
            testID="avatar-picker"
          >
            <Avatar
              firstName={user.firstName}
              lastName={user.lastName}
              avatarUrl={user.avatarUrl}
              size={sizes.avatarProfile}
            />
            {avatarBusy && (
              <View style={[styles.avatarOverlay, { borderRadius: sizes.avatarProfile / 2 }]}>
                <ActivityIndicator color={colors.onPrimary} />
              </View>
            )}
          </Pressable>

          <View style={styles.avatarActions}>
            <Pressable onPress={() => void handlePickAvatar()} disabled={avatarBusy} testID="change-avatar-button">
              <Text style={styles.avatarAction}>{user.avatarUrl ? 'Cambiar foto' : 'Agregar foto'}</Text>
            </Pressable>
            {user.avatarUrl && (
              <Pressable onPress={() => void handleRemoveAvatar()} disabled={avatarBusy} testID="remove-avatar-button">
                <Text style={[styles.avatarAction, styles.avatarActionDanger]}>Quitar foto</Text>
              </Pressable>
            )}
          </View>

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
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: overlays.backdrop,
  },
  avatarActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatarAction: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  avatarActionDanger: {
    color: colors.error,
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
