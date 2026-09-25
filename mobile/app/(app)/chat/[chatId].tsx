import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from '@/src/components/Avatar';
import { EmptyState, ErrorState, LoadingState } from '@/src/components/StateView';
import { MessageBubble } from '@/src/components/MessageBubble';
import { useMessages } from '@/src/hooks/useMessages';
import type { OutgoingAttachment } from '@/src/api/messages';
import { useSessionStore } from '@/src/store/session';
import { colors, radii, sizes, spacing, typography } from '@/src/theme/tokens';
import type { Message } from '@/src/types/api';

export default function ConversationScreen() {
  const { chatId, contactName, contactAvatar } = useLocalSearchParams<{
    chatId: string;
    contactName?: string;
    contactAvatar?: string;
  }>();
  const currentUserId = useSessionStore((s) => s.user?.id);
  const { messages, status, errorMessage, sending, reload, send } = useMessages(chatId);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  const submitText = async () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    try {
      await send(content);
    } catch {
      Alert.alert('No se pudo enviar', 'Revisá tu conexión e intentá de nuevo.');
      setText(content);
    }
  };

  const pickAndSendAttachment = () => {
    Alert.alert('Adjuntar', '¿Qué querés enviar?', [
      { text: 'Foto', onPress: () => void handlePickImage() },
      { text: 'Archivo', onPress: () => void handlePickDocument() },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para adjuntar una imagen.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await sendAttachment({
      uri: asset.uri,
      name: asset.fileName ?? 'imagen.jpg',
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await sendAttachment({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
    });
  };

  const sendAttachment = async (attachment: OutgoingAttachment) => {
    const content = text.trim() || undefined;
    setText('');
    try {
      await send(content, attachment);
    } catch {
      Alert.alert('No se pudo enviar el adjunto', 'Revisá tu conexión e intentá de nuevo.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <Avatar
                firstName={contactName?.split(' ')[0] ?? ''}
                lastName={contactName?.split(' ')[1] ?? ''}
                avatarUrl={contactAvatar || null}
                size={sizes.avatarConversationHeader}
              />
              <Text style={styles.headerName} numberOfLines={1}>
                {contactName}
              </Text>
            </View>
          ),
        }}
      />

      {status === 'loading' && <LoadingState label="Cargando mensajes..." />}

      {status === 'error' && (
        <ErrorState title="No pudimos cargar la conversación" description={errorMessage ?? undefined} onRetry={reload} />
      )}

      {status === 'ready' && messages.length === 0 && (
        <EmptyState title="Todavía no hay mensajes" description="Escribí el primero para arrancar la conversación" />
      )}

      {status === 'ready' && messages.length > 0 && (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} isOwn={item.senderId === currentUserId} />}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      <View style={styles.inputBar}>
        <Pressable onPress={pickAndSendAttachment} hitSlop={10} style={styles.attachButton} testID="attach-button">
          <Ionicons name="add" size={22} color={colors.textSecondary} />
        </Pressable>
        <TextInput
          style={styles.textInput}
          placeholder="Escribí un mensaje..."
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          testID="message-input"
        />
        <Pressable
          onPress={submitText}
          disabled={sending || !text.trim()}
          style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
          testID="send-button"
        >
          {sending ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Ionicons name="send" size={18} color={colors.onPrimary} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerName: {
    ...typography.conversationHeaderName,
    color: colors.textPrimary,
    maxWidth: 180,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  attachButton: {
    width: sizes.sendButton,
    height: sizes.sendButton,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: sizes.iconButtonHitArea,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...typography.bodyDefault,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  sendButton: {
    width: sizes.sendButton,
    height: sizes.sendButton,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
