import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { listUsers } from '@/src/api/users';
import { ApiError } from '@/src/api/client';
import { Avatar } from '@/src/components/Avatar';
import { EmptyState, ErrorState } from '@/src/components/StateView';
import { useChatsStore } from '@/src/store/chats';
import { useSessionStore } from '@/src/store/session';
import { colors, radii, sizes, spacing, typography } from '@/src/theme/tokens';
import type { User } from '@/src/types/api';

export default function NewChatScreen() {
  const currentUserId = useSessionStore((s) => s.user?.id);
  const startChat = useChatsStore((s) => s.startChat);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openingChatFor, setOpeningChatFor] = useState<string | null>(null);
  // Se incrementa en cada retry: `search` puede no haber cambiado (el error
  // no fue por el término de búsqueda), así que hace falta una dependencia
  // propia para forzar al efecto a reintentar el fetch.
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Patrón estándar de data fetching (debounce) en un efecto; ver nota en useMessages.ts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('loading');
    const timeout = setTimeout(async () => {
      try {
        const result = await listUsers({ search: search.trim() || undefined, limit: 30 });
        if (!cancelled) {
          setUsers(result.data.filter((u) => u.id !== currentUserId));
          setStatus('ready');
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof ApiError ? err.message : 'No pudimos buscar usuarios');
          setStatus('error');
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search, currentUserId, retryToken]);

  const openChatWith = async (user: User) => {
    setOpeningChatFor(user.id);
    try {
      const chat = await startChat(user.id);
      router.replace({
        pathname: '/(app)/chat/[chatId]',
        params: {
          chatId: chat.id,
          contactName: `${user.firstName} ${user.lastName}`,
          contactAvatar: user.avatarUrl ?? '',
        },
      });
    } catch {
      setErrorMessage('No pudimos abrir el chat. Intentá de nuevo.');
      setStatus('error');
    } finally {
      setOpeningChatFor(null);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Buscar por nombre o email"
        placeholderTextColor={colors.textTertiary}
        value={search}
        onChangeText={setSearch}
        autoFocus
        testID="user-search-input"
      />

      {status === 'loading' && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {status === 'error' && (
        <ErrorState title="Algo salió mal" description={errorMessage ?? undefined} onRetry={() => setRetryToken((t) => t + 1)} />
      )}

      {status === 'ready' && users.length === 0 && (
        <EmptyState title="No encontramos usuarios" description="Probá con otro nombre o email" />
      )}

      {status === 'ready' && users.length > 0 && (
        <FlatList
          data={users}
          keyExtractor={(user) => user.id}
          renderItem={({ item }) => (
            <Pressable
              style={styles.userRow}
              onPress={() => openChatWith(item)}
              disabled={openingChatFor !== null}
              testID={`user-row-${item.id}`}
            >
              <Avatar firstName={item.firstName} lastName={item.lastName} avatarUrl={item.avatarUrl} size={sizes.avatarSearchRow} />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={styles.userEmail}>{item.email}</Text>
              </View>
              {openingChatFor === item.id && <ActivityIndicator color={colors.primary} />}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  search: {
    height: sizes.controlHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing.lg,
    ...typography.bodyDefault,
    backgroundColor: colors.surfaceContainerLow,
    color: colors.textPrimary,
  },
  loading: {
    paddingTop: spacing.lg,
    alignItems: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  userEmail: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
