/**
 * Holder simple del token actual, separado del store de sesión a propósito:
 * el cliente HTTP (client.ts) necesita leer el token sin importar el store
 * de Zustand, que a su vez importa funciones de api/auth.ts que usan el
 * cliente HTTP — importar el store desde client.ts crearía un ciclo.
 */
let currentToken: string | null = null;

export function setAuthToken(token: string | null): void {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}
