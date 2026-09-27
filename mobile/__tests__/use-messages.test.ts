import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/src/api/messages', () => ({
  listMessages: jest.fn(),
  sendMessage: jest.fn(),
}));

// El hook se suscribe al canal de tiempo real: acá se mockea para que el
// test siga siendo unitario y no intente una conexión WS real.
jest.mock('@/src/realtime/socket', () => ({
  onMessageCreated: jest.fn(() => () => {}),
}));

import { listMessages, sendMessage } from '@/src/api/messages';
import { useMessages } from '@/src/hooks/useMessages';
import { useChatsStore } from '@/src/store/chats';
import { useSessionStore } from '@/src/store/session';
import type { Message, User } from '@/src/types/api';

const chatId = 'chat-1';

const fakeUser: User = {
  id: 'user-1',
  email: 'ana@example.com',
  firstName: 'Ana',
  lastName: 'García',
  birthDate: '1995-03-20',
  phone: '+5491122334455',
  avatarUrl: null,
  status: 'online',
  lastSeenAt: null,
  role: 'user',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('useMessages — envío con UI optimista', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({ user: fakeUser });
    useChatsStore.setState({ chats: [], status: 'idle', errorMessage: null });
    (listMessages as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 30 });
  });

  it('muestra el mensaje de inmediato y lo confirma cuando el server responde', async () => {
    // Promesa controlada a mano: el POST no resuelve solo hasta que se llame
    // `resolveSend`, así se puede observar el estado "pending" intermedio en
    // vez de que quede resuelto para cuando se revisa (act() de esta versión
    // drena la cola de microtareas, no solo la parte sincrónica de `send`).
    let resolveSend!: (message: Message) => void;
    (sendMessage as jest.Mock).mockImplementation(
      () => new Promise<Message>((resolve) => { resolveSend = resolve; }),
    );

    const { result } = await renderHook(() => useMessages(chatId));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let sendPromise!: Promise<void>;
    await act(() => {
      sendPromise = result.current.send('hola');
    });

    // Aparece antes de que resuelva el POST — esa es la UI optimista.
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ content: 'hola', pending: true });

    const serverMessage: Message = {
      id: 'msg-server-1',
      chatId,
      senderId: fakeUser.id,
      content: 'hola',
      attachment: null,
      sentAt: '2026-01-01T00:00:01.000Z',
    };
    await act(async () => {
      resolveSend(serverMessage);
      await sendPromise;
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toEqual(serverMessage);
  });

  it('marca el mensaje como fallido (no lo revierte) cuando el server lo rechaza', async () => {
    let rejectSend!: (err: unknown) => void;
    (sendMessage as jest.Mock).mockImplementation(
      () => new Promise((_resolve, reject) => { rejectSend = reject; }),
    );

    const { result } = await renderHook(() => useMessages(chatId));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let sendPromise!: Promise<void>;
    await act(() => {
      sendPromise = result.current.send('chau');
    });

    expect(result.current.messages[0]).toMatchObject({ content: 'chau', pending: true });

    await act(async () => {
      rejectSend(new Error('network error'));
      await sendPromise;
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ content: 'chau', pending: false, failed: true });
  });
});
