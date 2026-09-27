import { create } from 'zustand';
import { createChat as createChatRequest, listChats as listChatsRequest } from '@/src/api/chats';
import { ApiError } from '@/src/api/client';
import type { Chat, LastMessagePreview, Message, PresenceUpdate } from '@/src/types/api';

interface ChatsState {
  chats: Chat[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage: string | null;
  fetchChats: () => Promise<void>;
  startChat: (participantId: string) => Promise<Chat>;
  applyLastMessage: (chatId: string, preview: LastMessagePreview) => void;
  applyIncomingMessage: (message: Message) => void;
  applyPresence: (update: PresenceUpdate) => void;
}

export const useChatsStore = create<ChatsState>((set, get) => ({
  chats: [],
  status: 'idle',
  errorMessage: null,

  fetchChats: async () => {
    set({ status: 'loading', errorMessage: null });
    try {
      const chats = await listChatsRequest();
      set({ chats, status: 'ready' });
    } catch (err) {
      set({
        status: 'error',
        errorMessage: err instanceof ApiError ? err.message : 'No pudimos cargar tus chats',
      });
    }
  },

  startChat: async (participantId) => {
    const chat = await createChatRequest(participantId);
    const exists = get().chats.some((c) => c.id === chat.id);
    if (!exists) {
      set((state) => ({ chats: [chat, ...state.chats] }));
    }
    return chat;
  },

  /**
   * Reacciona a un mensaje que llegó por WS. Si el chat todavía no está en la
   * lista (el otro usuario recién lo creó), se recarga el listado en vez de
   * inventar un ítem local: los datos del contacto los arma el backend.
   */
  applyIncomingMessage: (message) => {
    const known = get().chats.some((chat) => chat.id === message.chatId);
    if (!known) {
      void get().fetchChats();
      return;
    }
    get().applyLastMessage(message.chatId, {
      content: message.content,
      senderId: message.senderId,
      sentAt: message.sentAt,
    });
  },

  /**
   * Presencia empujada por el gateway. Actualiza el contacto del chat, que es
   * de donde leen tanto el punto del listado como el header de la conversación.
   */
  applyPresence: (update) => {
    set((state) => {
      if (!state.chats.some((chat) => chat.contact.id === update.userId)) {
        return state;
      }
      return {
        chats: state.chats.map((chat) =>
          chat.contact.id === update.userId
            ? { ...chat, contact: { ...chat.contact, status: update.status } }
            : chat,
        ),
      };
    });
  },

  applyLastMessage: (chatId, preview) => {
    set((state) => ({
      chats: state.chats
        .map((chat) => (chat.id === chatId ? { ...chat, lastMessage: preview, updatedAt: preview.sentAt } : chat))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    }));
  },
}));
