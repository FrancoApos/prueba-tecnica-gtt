import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { resolveAssetUrl } from '@/src/config';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';
import { formatRelativeTimestamp } from '@/src/utils/format';
import type { LocalMessage } from '@/src/hooks/useMessages';

interface MessageBubbleProps {
  message: LocalMessage;
  isOwn: boolean;
  /** Solo se llama para un mensaje `failed` — reintenta el mismo envío. */
  onRetry?: (message: LocalMessage) => void;
}

export function MessageBubble({ message, isOwn, onRetry }: MessageBubbleProps) {
  const isImage = message.attachment?.mimeType.startsWith('image/');

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <View
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          message.pending && styles.bubblePending,
        ]}
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
        {message.failed ? (
          <Pressable onPress={() => onRetry?.(message)} hitSlop={8} testID={`message-retry-${message.id}`}>
            <Text style={styles.failedText}>
              ⚠ {message.failedReason ?? 'No se pudo enviar'} · Reintentar
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.timestamp, isOwn ? styles.timestampOwn : styles.timestampOther]}>
            {message.pending ? 'Enviando…' : formatRelativeTimestamp(message.sentAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
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
    borderRadius: radii.bubble,
    padding: spacing.md,
    gap: spacing.xs,
  },
  bubbleOwn: {
    backgroundColor: colors.primaryContainer,
    borderBottomRightRadius: radii.bubbleTail,
  },
  bubbleOther: {
    backgroundColor: colors.surfaceContainerLow,
    borderBottomLeftRadius: radii.bubbleTail,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  bubblePending: {
    opacity: 0.6,
  },
  textOwn: {
    ...typography.bodyDefault,
    color: colors.onPrimary,
  },
  textOther: {
    ...typography.bodyDefault,
    color: colors.textPrimary,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: radii.control,
    marginBottom: spacing.xs,
  },
  fileChip: {
    paddingVertical: spacing.xs,
  },
  fileChipText: {
    ...typography.caption,
    textDecorationLine: 'underline',
  },
  timestamp: {
    ...typography.timestamp,
    alignSelf: 'flex-end',
  },
  timestampOwn: {
    // onPrimary (blanco) al 70% — valor literal porque es una variante de
    // opacidad de un token, no un color nuevo; tomado 1 a 1 del HTML real
    // de Stitch (`color: rgba(255, 255, 255, 0.7)`).
    color: 'rgba(255,255,255,0.7)',
  },
  timestampOther: {
    color: colors.textTertiary,
  },
  failedText: {
    ...typography.timestamp,
    color: colors.error,
    alignSelf: 'flex-end',
  },
});
