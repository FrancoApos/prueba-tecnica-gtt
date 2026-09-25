import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveAssetUrl } from '@/src/config';
import { colors, radius, spacing } from '@/src/theme';
import { formatRelativeTimestamp } from '@/src/utils/format';
import type { Message } from '@/src/types/api';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const isImage = message.attachment?.mimeType.startsWith('image/');

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View
        style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
        testID={`message-bubble-${message.id}`}
      >
        {message.attachment && isImage && (
          <Image source={{ uri: resolveAssetUrl(message.attachment.url) }} style={styles.image} />
        )}
        {message.attachment && !isImage && (
          <Pressable
            style={styles.fileChip}
            onPress={() => Linking.openURL(resolveAssetUrl(message.attachment!.url))}
          >
            <Text style={[styles.fileChipText, isOwn ? styles.textOwn : styles.textOther]} numberOfLines={1}>
              📎 {message.attachment.filename}
            </Text>
          </Pressable>
        )}
        {message.content && (
          <Text style={isOwn ? styles.textOwn : styles.textOther}>{message.content}</Text>
        )}
        <Text style={[styles.timestamp, isOwn ? styles.timestampOwn : styles.timestampOther]}>
          {formatRelativeTimestamp(message.sentAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: spacing.md,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  bubbleOwn: {
    backgroundColor: colors.bubbleOwn,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.bubbleOther,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  textOwn: {
    color: colors.bubbleOwnText,
    fontSize: 15,
  },
  textOther: {
    color: colors.bubbleOtherText,
    fontSize: 15,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  fileChip: {
    paddingVertical: 4,
  },
  fileChipText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  timestamp: {
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  timestampOwn: {
    color: 'rgba(255,255,255,0.75)',
  },
  timestampOther: {
    color: colors.textMuted,
  },
});
