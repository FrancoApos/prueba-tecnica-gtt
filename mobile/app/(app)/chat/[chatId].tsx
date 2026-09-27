import { useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
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
import { useMessages, type LocalMessage } from '@/src/hooks/useMessages';
import type { OutgoingAttachment } from '@/src/api/messages';
import { useChatsStore } from '@/src/store/chats';
import { useSessionStore } from '@/src/store/session';
import { showAlert, showChoice } from '@/src/utils/alert';
import { formatDayLabel } from '@/src/utils/format';
import { colors, radii, sizes, spacing, typography } from '@/src/theme/tokens';

type ConversationListItem =
  | { type: 'separator'; key: string; label: string }
  | { type: 'message'; key: string; message: LocalMessage };

/** Dia calendario (no franja de 24hs) para agrupar los separadores por fecha real. */
function dayKeyOf(isoDate: string): string {
  const date = new Date(isoDate);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function ConversationScreen() {
  const { chatId, contactName, contactAvatar } = useLocalSearchParams<{
    chatId: string;
    contactName?: string;
    contactAvatar?: string;
  }>();
  const currentUserId = useSessionStore((s) => s.user?.id);
  // El contacto sale del store: es lo único que trae el estado de conexión y
  // se mantiene al día con el listado. Los params quedan como fallback para el
  // primer render y para un chat recién creado que todavía no entró al store.
  const contact = useChatsStore((s) => s.chats.find((c) => c.id === chatId)?.contact);
  const contactFullName = contact ? `${contact.firstName} ${contact.lastName}` : (contactName ?? '');
  const contactFirstName = contact?.firstName ?? contactName?.split(' ')[0] ?? '';
  const contactLastName = contact?.lastName ?? contactName?.split(' ')[1] ?? '';
  const contactAvatarUrl = contact?.avatarUrl ?? (contactAvatar || null);
  const contactStatus = contact?.status;
  const { messages, status, errorMessage, reload, send, retry } = useMessages(chatId);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ConversationListItem>>(null);

  const listItems = useMemo<ConversationListItem[]>(() => {
    const items: ConversationListItem[] = [];
    let lastDayKey: string | null = null;
    for (const message of messages) {
      const dayKey = dayKeyOf(message.sentAt);
      if (dayKey !== lastDayKey) {
        items.push({ type: 'separator', key: `separator-${dayKey}`, label: formatDayLabel(message.sentAt) });
        lastDayKey = dayKey;
      }
      items.push({ type: 'message', key: message.id, message });
    }
    return items;
  }, [messages]);

  const submitText = () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    // No hace falta esperar ni manejar el error acá: `send` es optimista (la
    // burbuja aparece al instante) y si falla se marca `failed` en la propia
    // burbuja, con reintento — ver MessageBubble.
    void send(content);
  };

  const pickAndSendAttachment = () => {
    showChoice('Adjuntar', '¿Qué querés enviar?', [
      { label: 'Foto', onPress: () => void handlePickImage() },
      { label: 'Archivo', onPress: () => void handlePickDocument() },
    ]);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert('Permiso necesario', 'Necesitamos acceso a tus fotos para adjuntar una imagen.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    sendAttachment({
      uri: asset.uri,
      name: asset.fileName ?? 'imagen.jpg',
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    // El picker puede devolver un asset sin una URI legible (archivo no
    // materializado localmente, o el proveedor de documentos no terminó de
    // resolverlo) aunque reporte un tamaño no nulo — el tipo de
    // DocumentPickerAsset dice `uri: string` siempre, pero en runtime no
    // siempre es cierto (visto con un .docx real: `uri` llegaba vacío y React
    // Native rechazaba el FormData con "Unsupported FormDataPart
    // implementation" en vez de un error de red entendible). Mejor avisar de
    // una que intentar subir algo ilegible.
    if (!asset.uri || asset.size === 0) {
      showAlert(
        'No se pudo leer el archivo',
        'Puede que todavía no esté descargado en el teléfono, o el sistema no dio una ubicación válida. Esperá un momento o elegí otro.',
      );
      return;
    }
    sendAttachment({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
    });
  };

  const sendAttachment = (attachment: OutgoingAttachment) => {
    const content = text.trim() || undefined;
    setText('');
    void send(content, attachment);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          // Sin esto iOS pone al lado de la flecha el título de la pantalla
          // anterior; como el listado vive en el grupo de rutas `(tabs)`, ahí
          // aparecía literalmente "(tabs)".
          headerBackButtonDisplayMode: 'minimal',
          // `headerTitleAlign: 'left'` no sirve acá: en iOS el título del
          // header nativo va siempre al center view (esa opción es solo
          // Android), y quedaba un hueco enorme entre la flecha y el contacto.
          // El bloque se monta entonces como `headerLeft`; con
          // `headerBackVisible` la flecha nativa se renderiza DENTRO de esa
          // misma vista (backButtonInCustomView), así que queda todo junto y
          // pegado a la izquierda, sin dejar de ser el botón nativo.
          headerTitleAlign: 'left',
          headerBackVisible: true,
          headerTitle: () => null,
          headerLeft: () => (
            <View style={styles.headerContact}>
              <Avatar
                firstName={contactFirstName}
                lastName={contactLastName}
                avatarUrl={contactAvatarUrl}
                status={contactStatus}
                size={sizes.avatarConversationHeader}
              />
              <View style={styles.headerTexts}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {contactFullName}
                </Text>
                {contactStatus && (
                  <Text style={styles.headerStatus} numberOfLines={1}>
                    {contactStatus === 'online' ? 'Activo' : 'Inactivo'}
                  </Text>
                )}
              </View>
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
          data={listItems}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) =>
            item.type === 'separator' ? (
              <View style={styles.daySeparator}>
                <Text style={styles.daySeparatorText}>{item.label}</Text>
              </View>
            ) : (
              <MessageBubble
                message={item.message}
                isOwn={item.message.senderId === currentUserId}
                onRetry={retry}
              />
            )
          }
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
          disabled={!text.trim()}
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          testID="send-button"
        >
          <Ionicons name="send" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  headerContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTexts: {
    justifyContent: 'center',
  },
  headerName: {
    ...typography.conversationHeaderName,
    color: colors.textPrimary,
    maxWidth: 180,
  },
  headerStatus: {
    ...typography.caption,
    color: colors.textSecondary,
    maxWidth: 180,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  daySeparator: {
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  daySeparatorText: {
    ...typography.captionMedium,
    color: colors.textTertiary,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    overflow: 'hidden',
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
