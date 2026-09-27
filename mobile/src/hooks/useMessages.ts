import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/src/api/client';
import { listMessages, sendMessage, type OutgoingAttachment } from '@/src/api/messages';
import { onMessageCreated } from '@/src/realtime/socket';
import { useChatsStore } from '@/src/store/chats';
import { useSessionStore } from '@/src/store/session';
import type { Message } from '@/src/types/api';

type Status = 'loading' | 'ready' | 'error';

/**
 * Un mensaje recién enviado por este cliente, mientras no se confirmó (o
 * falló) contra el server. `pending`/`failed` no existen en el tipo `Message`
 * del backend — son puramente de UI optimista, locales a este hook.
 */
export interface LocalMessage extends Message {
  pending?: boolean;
  failed?: boolean;
  /** Motivo del fallo, para mostrarlo en la burbuja en vez de un texto genérico. */
  failedReason?: string;
}

let tempIdCounter = 0;

/**
 * Estado de la conversación de UN chat. Es local al hook (no un store
 * global) porque solo la pantalla de conversación lo necesita — el
 * "lastMessage" que sí se ve en otras pantallas vive en useChatsStore y se
 * actualiza acá vía applyLastMessage.
 */
export function useMessages(chatId: string) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const applyLastMessage = useChatsStore((s) => s.applyLastMessage);
  const currentUserId = useSessionStore((s) => s.user?.id);

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const result = await listMessages(chatId);
      setMessages(result.data);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof ApiError ? err.message : 'No pudimos cargar los mensajes');
    }
  }, [chatId]);

  useEffect(() => {
    // Patrón estándar de data fetching en un efecto (react.dev lo documenta así);
    // `load` marca `status: 'loading'` de forma síncrona antes del await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  /**
   * Mensajes empujados por el backend (ver `realtime/socket.ts`). Se filtran
   * por chat y se deduplican por id porque el server también le reenvía el
   * mensaje al remitente — sus otras sesiones lo necesitan, y esta ya lo
   * agregó de forma optimista al enviarlo.
   *
   * El push puede llegar ANTES de que resuelva el propio `await sendMessage`
   * (el server emite el socket casi al mismo tiempo que responde el HTTP): si
   * todavía hay una burbuja `pending` de este mismo remitente con el mismo
   * texto, se reemplaza esa en vez de agregar una segunda — si no, `send`
   * más tarde no encontraría el `tempId` para reemplazar y el mensaje
   * quedaría duplicado.
   */
  useEffect(
    () =>
      onMessageCreated((message) => {
        if (message.chatId !== chatId) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          const pendingIndex = prev.findIndex(
            (m) => m.pending && m.senderId === message.senderId && m.content === message.content,
          );
          if (pendingIndex === -1) return [...prev, message];
          const next = [...prev];
          next[pendingIndex] = message;
          return next;
        });
      }),
    [chatId],
  );

  /**
   * UI optimista: el mensaje aparece en la lista al instante (`pending: true`,
   * con la URI local del adjunto si hay uno) y recién después se confirma
   * contra el server. Si falla, se marca `failed` en vez de desaparecer —
   * `retry` reintenta el mismo envío desde ese estado.
   */
  const send = useCallback(
    async (content: string | undefined, attachment?: OutgoingAttachment) => {
      const tempId = `temp-${++tempIdCounter}`;
      const optimisticMessage: LocalMessage = {
        id: tempId,
        chatId,
        senderId: currentUserId ?? '',
        content: content?.trim() || null,
        attachment: attachment
          ? { url: attachment.uri, filename: attachment.name, mimeType: attachment.mimeType, size: 0 }
          : null,
        sentAt: new Date().toISOString(),
        pending: true,
      };

      setMessages((prev) => [...prev, optimisticMessage]);

      try {
        const message = await sendMessage(chatId, content, attachment);
        setMessages((prev) => prev.map((m) => (m.id === tempId ? message : m)));
        applyLastMessage(chatId, {
          content: message.content,
          senderId: message.senderId,
          sentAt: message.sentAt,
        });
      } catch (err) {
        const reason = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Error desconocido';
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true, failedReason: reason } : m)),
        );
      }
    },
    [chatId, applyLastMessage, currentUserId],
  );

  const retry = useCallback(
    (message: LocalMessage) => {
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
      const attachment: OutgoingAttachment | undefined = message.attachment
        ? { uri: message.attachment.url, name: message.attachment.filename, mimeType: message.attachment.mimeType }
        : undefined;
      return send(message.content ?? undefined, attachment);
    },
    [send],
  );

  return { messages, status, errorMessage, reload: load, send, retry };
}
