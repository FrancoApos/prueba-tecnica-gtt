import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { login as loginRequest } from '@/src/api/auth';
import { setAuthToken } from '@/src/api/token';
import type { User } from '@/src/types/api';

const TOKEN_KEY = 'chatapp_token';
const USER_KEY = 'chatapp_user';

interface SessionState {
  /** "loading" mientras se hidrata desde SecureStore al abrir la app. */
  status: 'loading' | 'signedIn' | 'signedOut';
  token: string | null;
  user: User | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  token: null,
  user: null,

  hydrate: async () => {
    const [token, userJson] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    if (token && userJson) {
      setAuthToken(token);
      set({ token, user: JSON.parse(userJson) as User, status: 'signedIn' });
    } else {
      set({ status: 'signedOut' });
    }
  },

  login: async (email, password) => {
    const result = await loginRequest(email, password);
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, result.accessToken),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.user)),
    ]);
    setAuthToken(result.accessToken);
    set({ token: result.accessToken, user: result.user, status: 'signedIn' });
  },

  logout: async () => {
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
    setAuthToken(null);
    set({ token: null, user: null, status: 'signedOut' });
  },

  updateUser: (user) => {
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)).catch(() => {});
    set({ user });
  },
}));
