import { create } from 'zustand';
import { login as loginRequest } from '@/src/api/auth';
import { setUnauthorizedHandler } from '@/src/api/auth-events';
import { setAuthToken } from '@/src/api/token';
import { connectSocket, disconnectSocket } from '@/src/realtime/socket';
import { secureStorage } from '@/src/store/secure-storage';
import type { User } from '@/src/types/api';

const TOKEN_KEY = 'chatapp_token';
const USER_KEY = 'chatapp_user';

interface SessionState {
  /** "loading" mientras se hidrata el almacenamiento seguro al abrir la app. */
  status: 'loading' | 'signedIn' | 'signedOut';
  user: User | null;
  /** Seteado solo cuando el logout lo dispara un 401 (JWT vencido/inválido), no un logout manual. */
  sessionExpiredMessage: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  clearSessionExpiredMessage: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  user: null,
  sessionExpiredMessage: null,

  hydrate: async () => {
    const [token, userJson] = await Promise.all([
      secureStorage.getItem(TOKEN_KEY),
      secureStorage.getItem(USER_KEY),
    ]);
    if (token && userJson) {
      setAuthToken(token);
      connectSocket(token);
      set({ user: JSON.parse(userJson) as User, status: 'signedIn' });
    } else {
      set({ status: 'signedOut' });
    }
  },

  login: async (email, password) => {
    const result = await loginRequest(email, password);
    await Promise.all([
      secureStorage.setItem(TOKEN_KEY, result.accessToken),
      secureStorage.setItem(USER_KEY, JSON.stringify(result.user)),
    ]);
    setAuthToken(result.accessToken);
    connectSocket(result.accessToken);
    set({ user: result.user, status: 'signedIn' });
  },

  logout: async () => {
    await Promise.all([secureStorage.removeItem(TOKEN_KEY), secureStorage.removeItem(USER_KEY)]);
    setAuthToken(null);
    disconnectSocket();
    set({ user: null, status: 'signedOut' });
  },

  updateUser: (user) => {
    secureStorage.setItem(USER_KEY, JSON.stringify(user)).catch(() => {});
    set({ user });
  },

  clearSessionExpiredMessage: () => set({ sessionExpiredMessage: null }),
}));

/**
 * Un 401 (de `client.ts`) o un socket rechazado por token inválido (ver
 * `realtime/socket.ts`) llegan acá — mismo JWT, mismo motivo. Se pisa el
 * `sessionExpiredMessage` antes de `logout()` porque `set()` de Zustand
 * mergea (no reemplaza) el estado, así que el `status: 'signedOut'` del
 * logout no lo borra.
 */
setUnauthorizedHandler(() => {
  useSessionStore.setState({ sessionExpiredMessage: 'Tu sesión expiró. Iniciá sesión de nuevo.' });
  void useSessionStore.getState().logout();
});
