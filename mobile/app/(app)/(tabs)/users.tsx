import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '@/src/api/client';
import { deleteUser, listUsers } from '@/src/api/users';
import { Avatar } from '@/src/components/Avatar';
import { SkeletonRows } from '@/src/components/Skeleton';
import {
  DEFAULT_USERS_SORT,
  UsersSortSheet,
  usersSortLabel,
  usersSortQuery,
  type UsersSortKey,
} from '@/src/components/UsersSortSheet';
import { EmptyState, ErrorState } from '@/src/components/StateView';
import { useChatsStore } from '@/src/store/chats';
import { useSessionStore } from '@/src/store/session';
import { showAlert, showChoice } from '@/src/utils/alert';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';
import type { User } from '@/src/types/api';

const PAGE_SIZE = 20;

/**
 * Directorio de usuarios (módulo obligatorio: "Creación, consulta,
 * actualización y eliminación de usuarios" + "Listado con filtro de texto,
 * paginado y ordenamiento"). Cualquiera puede ver el directorio y arrancar un
 * chat desde acá; crear, editar y eliminar usuarios son acciones de admin y
 * solo se muestran con ese rol. Para editar y eliminar el gate real es del
 * backend (`RolesGuard`) y acá solo se ocultan los botones para no ofrecer una
 * acción que el server va a rechazar igual. El alta no tiene gate de servidor:
 * `POST /users` es público porque es el mismo endpoint de alta de cuenta (ver
 * `docs/DECISIONS.md`), así que esconder el botón es coherencia de UI, no una
 * barrera de seguridad.
 */
export default function UsersScreen() {
  const currentUser = useSessionStore((s) => s.user);
  const startChat = useChatsStore((s) => s.startChat);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<UsersSortKey>(DEFAULT_USERS_SORT);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /**
   * Memoizado a propósito, no por performance. El `<Screen>` de expo-router
   * (`views/Screen.js`) mete `options` **por referencia** en las dependencias
   * del layout effect que llama a `navigation.setOptions`. Un objeto literal
   * inline es una referencia nueva en cada render, así que el efecto corría
   * siempre; `setOptions` cambia el estado del navegador, eso re-renderiza la
   * pantalla, y vuelta a empezar: "Maximum update depth exceeded". Con `title`
   * solo no se notaba (react-navigation corta cuando las opciones resultantes
   * son iguales), pero `headerRight` es una función nueva cada vez, así que
   * nunca eran iguales y el ciclo no paraba.
   */
  const screenOptions = useMemo(
    () => ({
      title: 'Users',
      headerRight: isAdmin
        ? () => (
            <Pressable onPress={() => router.push('/(app)/new-user')} hitSlop={12} testID="new-user-button">
              <Ionicons name="person-add-outline" size={22} color={colors.primary} />
            </Pressable>
          )
        : undefined,
    }),
    [isAdmin],
  );

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const result = await listUsers({
        search: search.trim() || undefined,
        page,
        limit: PAGE_SIZE,
        ...usersSortQuery(sort),
      });
      setUsers(result.data);
      setTotal(result.total);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'No pudimos cargar los usuarios');
      setStatus('error');
    }
  }, [search, page, sort]);

  useEffect(() => {
    // Resetea la paginación cuando cambia la búsqueda o el orden: la página 3
    // del listado anterior no tiene ningún significado en el nuevo. Patrón
    // estándar de "derivar estado de una prop que cambió" en un efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, sort]);

  useEffect(() => {
    // Patrón estándar de data fetching en un efecto; ver nota en useMessages.ts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openChatWith = async (user: User) => {
    if (user.id === currentUser?.id) return;
    setBusyId(user.id);
    try {
      const chat = await startChat(user.id);
      router.push({
        pathname: '/(app)/chat/[chatId]',
        params: {
          chatId: chat.id,
          contactName: `${user.firstName} ${user.lastName}`,
          contactAvatar: user.avatarUrl ?? '',
        },
      });
    } catch {
      showAlert('No se pudo abrir el chat', 'Intentá de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  // Los avisos van por `showAlert`/`showChoice` y no por `Alert.alert`: el
  // Alert de react-native-web es un no-op, así que en el browser el borrado
  // quedaba mudo y el botón parecía muerto (ver `src/utils/alert.web.ts`).
  const confirmDelete = (user: User) => {
    showChoice('Eliminar usuario', `¿Eliminar la cuenta de ${user.firstName} ${user.lastName}?`, [
      { label: 'Eliminar', style: 'destructive', onPress: () => void handleDelete(user) },
    ]);
  };

  const handleDelete = async (user: User) => {
    setBusyId(user.id);
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      showAlert('No se pudo eliminar', err instanceof ApiError ? err.message : 'Intentá de nuevo.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={screenOptions} />

      <TextInput
        style={styles.search}
        placeholder="Buscar por nombre o email"
        placeholderTextColor={colors.textTertiary}
        value={search}
        onChangeText={setSearch}
        testID="users-search-input"
      />

      {status === 'ready' && total > 0 && (
        <View style={styles.controls}>
          <Text style={styles.count} testID="users-count">
            {total} {total === 1 ? 'usuario' : 'usuarios'}
          </Text>
          <Pressable
            style={styles.sortTrigger}
            onPress={() => setSortSheetOpen(true)}
            testID="users-sort-trigger"
          >
            <Ionicons name="swap-vertical-outline" size={16} color={colors.primary} />
            <Text style={styles.sortTriggerLabel}>{usersSortLabel(sort)}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
          </Pressable>
        </View>
      )}

      {status === 'loading' && users.length === 0 && <SkeletonRows avatarSize={44} rowHeight={68} />}

      {status === 'error' && (
        <ErrorState title="No pudimos cargar los usuarios" description={errorMessage ?? undefined} onRetry={load} />
      )}

      {status === 'ready' && users.length === 0 && search.trim() && (
        <EmptyState title={`Sin resultados para "${search.trim()}"`} description="Probá con otro nombre o email" />
      )}

      {status === 'ready' && users.length === 0 && !search.trim() && (
        <EmptyState title="Todavía no hay usuarios" description="Tocá el ícono de arriba para crear el primero" />
      )}

      {users.length > 0 && (
        <FlatList
          data={users}
          keyExtractor={(user) => user.id}
          renderItem={({ item }) => {
            const isSelf = item.id === currentUser?.id;
            const isBusy = busyId === item.id;
            return (
              <Pressable
                style={styles.row}
                onPress={() => openChatWith(item)}
                disabled={isSelf || busyId !== null}
                testID={`user-row-${item.id}`}
              >
                <Avatar firstName={item.firstName} lastName={item.lastName} avatarUrl={item.avatarUrl} status={item.status} size={44} />
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.firstName} {item.lastName} {isSelf && '(vos)'}
                  </Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
                {isBusy && <ActivityIndicator color={colors.primary} />}
                {!isBusy && isAdmin && !isSelf && (
                  <View style={styles.actions}>
                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        router.push({ pathname: '/(app)/edit-user', params: { userId: item.id } })
                      }
                      testID={`edit-user-${item.id}`}
                    >
                      <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => confirmDelete(item)} testID={`delete-user-${item.id}`}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {status === 'ready' && total > 0 && (
        <View style={styles.pagination}>
          <Pressable disabled={page <= 1} onPress={() => setPage((p) => p - 1)} testID="users-prev-page">
            <Text style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}>← Anterior</Text>
          </Pressable>
          <Text style={styles.pageLabel}>
            Página {page} de {totalPages}
          </Text>
          <Pressable disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)} testID="users-next-page">
            <Text style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}>Siguiente →</Text>
          </Pressable>
        </View>
      )}

      <UsersSortSheet
        visible={sortSheetOpen}
        value={sort}
        onApply={(key) => {
          setSort(key);
          setSortSheetOpen(false);
        }}
        onClose={() => setSortSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  search: {
    margin: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing.lg,
    ...typography.bodyDefault,
    backgroundColor: colors.surfaceContainerLow,
    color: colors.textPrimary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  count: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  sortTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainer,
  },
  sortTriggerLabel: {
    ...typography.captionMedium,
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  email: {
    ...typography.caption,
    color: colors.textTertiary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 44 + spacing.lg + spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pageButton: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
  pageButtonDisabled: {
    color: colors.textTertiary,
  },
  pageLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
