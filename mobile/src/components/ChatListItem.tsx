import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/src/components/Avatar';
import { colors, sizes, spacing, typography } from '@/src/theme/tokens';
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
    height: sizes.chatRowHeight,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  pressed: {
    backgroundColor: colors.surfaceContainerLow,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  timestamp: {
    ...typography.timestamp,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
  preview: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
