/**
 * Variante web de `secure-storage.ts` (ver ahí el por qué del split).
 *
 * Usa `localStorage`, que NO es almacenamiento seguro: en el browser no hay
 * Keychain/Keystore disponible. Es aceptable porque la web acá es solo la
 * herramienta para probar la app en la PC (un segundo cliente contra la misma
 * API); el target real de entrega es el bundle nativo. Los accesos van en
 * try/catch porque en modo incógnito o con cookies bloqueadas `localStorage`
 * puede tirar excepción.
 */
export const secureStorage = {
  getItem: (key: string): Promise<string | null> => {
    try {
      return Promise.resolve(globalThis.localStorage?.getItem(key) ?? null);
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem: (key: string, value: string): Promise<void> => {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Sesión no persistida: la app sigue funcionando en memoria.
    }
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // idem setItem.
    }
    return Promise.resolve();
  },
};
