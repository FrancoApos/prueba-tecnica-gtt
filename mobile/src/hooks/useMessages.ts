import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/src/api/client';
import { listMessages, sendMessage, type OutgoingAttachment } from '@/src/api/messages';
import { useChatsStore } from '@/src/store/chats';
import type { Message } from '@/src/types/api';

type Status = 'loading' | 'ready' | 'error';

/**
 * Estado de la conversación de UN chat. Es local al hook (no un store
 * global) porque solo la pantalla de conversación lo necesita — el
 * "lastMessage" que sí se ve en otras pantallas vive en useChatsStore y se
 * actualiza acá vía applyLastMessage.
 */
export function useMessages(chatId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const applyLastMessage = useChatsStore((s) => s.applyLastMessage);

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

  const send = useCallback(
    async (content: string | undefined, attachment?: OutgoingAttachment) => {
      setSending(true);
      try {
        const message = await sendMessage(chatId, content, attachment);
        setMessages((prev) => [...prev, message]);
        applyLastMessage(chatId, {
          content: message.content,
          senderId: message.senderId,
          sentAt: message.sentAt,
        });
        return message;
      } finally {
        setSending(false);
      }
    },
    [chatId, applyLastMessage],
  );

  return { messages, status, errorMessage, sending, reload: load, send };
}
