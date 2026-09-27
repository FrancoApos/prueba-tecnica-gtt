import * as SecureStore from 'expo-secure-store';

/**
 * Persistencia del token/sesión en el dispositivo (Keychain en iOS,
 * Keystore en Android). La variante web vive en `secure-storage.web.ts`:
 * Metro resuelve automáticamente el sufijo `.web` al bundlear para browser,
 * porque `expo-secure-store` no tiene implementación web (su módulo nativo
 * en web es literalmente un objeto vacío).
 */
export const secureStorage = {
  getItem: (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
};
