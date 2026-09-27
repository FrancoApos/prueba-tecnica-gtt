import { create } from 'zustand';
import { createChat as createChatRequest, listChats as listChatsRequest } from '@/src/api/chats';
import { ApiError } from '@/src/api/client';
import type { Chat, LastMessagePreview, Message } from '@/src/types/api';

interface ChatsState {
  chats: Chat[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  errorMessage: string | null;
  fetchChats: () => Promise<void>;
  startChat: (participantId: string) => Promise<Chat>;
  applyLastMessage: (chatId: string, preview: LastMessagePreview) => void;
  applyIncomingMessage: (message: Message) => void;
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

  applyLastMessage: (chatId, preview) => {
    set((state) => ({
      chats: state.chats
        .map((chat) => (chat.id === chatId ? { ...chat, lastMessage: preview, updatedAt: preview.sentAt } : chat))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    }));
  },
}));
