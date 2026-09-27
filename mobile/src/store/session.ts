import { create } from 'zustand';
import { login as loginRequest } from '@/src/api/auth';
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
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  user: null,

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
}));
