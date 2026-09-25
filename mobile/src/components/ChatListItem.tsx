import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/src/components/Avatar';
import { colors, spacing } from '@/src/theme';
import { formatRelativeTimestamp } from '@/src/utils/format';
import type { Chat } from '@/src/types/api';

interface ChatListItemProps {
  chat: Chat;
  onPress: () => void;
}

export function ChatListItem({ chat, onPress }: ChatListItemProps) {
  const { contact, lastMessage } = chat;
  const preview = lastMessage
    ? lastMessage.content ?? 'Adjunto'
    : 'Todavía no hay mensajes';

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
      testID={`chat-item-${chat.id}`}
    >
      <Avatar
        firstName={contact.firstName}
        lastName={contact.lastName}
        avatarUrl={contact.avatarUrl}
        status={contact.status}
      />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {contact.firstName} {contact.lastName}
          </Text>
          {lastMessage && (
            <Text style={styles.timestamp}>{formatRelativeTimestamp(lastMessage.sentAt)}</Text>
          )}
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm + 4,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  preview: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
