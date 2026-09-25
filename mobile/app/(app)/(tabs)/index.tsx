import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { ChatListItem } from '@/src/components/ChatListItem';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/StateView';
import { useChatsStore } from '@/src/store/chats';
import { colors, radii, shadows, sizes, spacing } from '@/src/theme/tokens';

export default function ChatsListScreen() {
  const chats = useChatsStore((s) => s.chats);
  const status = useChatsStore((s) => s.status);
  const errorMessage = useChatsStore((s) => s.errorMessage);
  const fetchChats = useChatsStore((s) => s.fetchChats);

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [fetchChats]),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Chats' }} />

      {status === 'loading' && chats.length === 0 && <LoadingState label="Cargando chats..." />}

      {status === 'error' && (
        <ErrorState
          title="No pudimos cargar tus chats"
          description={errorMessage ?? undefined}
          onRetry={fetchChats}
        />
      )}

      {status === 'ready' && chats.length === 0 && (
        <EmptyState
          title="Todavía no tenés chats"
          description="Tocá el botón de abajo para empezar una conversación"
        />
      )}

      {chats.length > 0 && (
        <FlatList
          data={chats}
          keyExtractor={(chat) => chat.id}
          renderItem={({ item }) => (
            <ChatListItem
              chat={item}
              onPress={() =>
                router.push({
                  pathname: '/(app)/chat/[chatId]',
                  params: {
                    chatId: item.id,
                    contactName: `${item.contact.firstName} ${item.contact.lastName}`,
                    contactAvatar: item.contact.avatarUrl ?? '',
                  },
                })
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={status === 'loading'} onRefresh={fetchChats} tintColor={colors.primary} />
          }
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/(app)/new-chat')}
        testID="new-chat-button"
      >
        <Ionicons name="create" size={24} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    // Inset para alinear con el texto de la fila, no con el avatar.
    marginLeft: sizes.avatarListRow + spacing.lg + spacing.md,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: sizes.fabOffsetBottom,
    width: sizes.fab,
    height: sizes.fab,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.light.fab,
  },
});
