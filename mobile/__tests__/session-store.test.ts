import { act } from '@testing-library/react-native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/src/api/auth', () => ({
  login: jest.fn(),
}));

// El store abre/cierra el canal de tiempo real: acá se mockea para que el test
// siga siendo unitario y no intente una conexión WS real.
jest.mock('@/src/realtime/socket', () => ({
  connectSocket: jest.fn(),
  disconnectSocket: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { login as loginRequest } from '@/src/api/auth';
import { connectSocket, disconnectSocket } from '@/src/realtime/socket';
import { useSessionStore } from '@/src/store/session';
import { getAuthToken } from '@/src/api/token';

const fakeUser = {
  id: 'user-1',
  email: 'ana@example.com',
  firstName: 'Ana',
  lastName: 'García',
  birthDate: '1995-03-20',
  phone: '+5491122334455',
  avatarUrl: null,
  status: 'online' as const,
  lastSeenAt: null,
  role: 'user' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('useSessionStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({ status: 'loading', token: null, user: null });
  });

  it('starts as signedOut when there is nothing in SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    await act(async () => {
      await useSessionStore.getState().hydrate();
    });

    expect(useSessionStore.getState().status).toBe('signedOut');
  });

  it('logs in, persists the session and exposes the token to the API client', async () => {
    (loginRequest as jest.Mock).mockResolvedValue({ accessToken: 'token-123', user: fakeUser });

    await act(async () => {
      await useSessionStore.getState().login('ana@example.com', 'Sup3rSecret!');
    });

    const state = useSessionStore.getState();
    expect(state.status).toBe('signedIn');
    expect(state.user?.email).toBe('ana@example.com');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('chatapp_token', 'token-123');
    expect(getAuthToken()).toBe('token-123');
    expect(connectSocket).toHaveBeenCalledWith('token-123');
  });

  it('clears the session and the stored token on logout', async () => {
    useSessionStore.setState({ status: 'signedIn', token: 'token-123', user: fakeUser });

    await act(async () => {
      await useSessionStore.getState().logout();
    });

    const state = useSessionStore.getState();
    expect(state.status).toBe('signedOut');
    expect(state.user).toBeNull();
    expect(getAuthToken()).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('chatapp_token');
    expect(disconnectSocket).toHaveBeenCalled();
  });
});
