/**
 * Notifica un 401 en una request autenticada, separado del store de sesión
 * a propósito — mismo motivo que `token.ts`: el cliente HTTP no puede
 * importar el store de Zustand (que a su vez usa el cliente) sin crear un
 * ciclo. `session.ts` registra el handler real; acá solo se guarda.
 */
type UnauthorizedHandler = () => void;

let handler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(fn: UnauthorizedHandler): void {
  handler = fn;
}

export function notifyUnauthorized(): void {
  handler?.();
}
