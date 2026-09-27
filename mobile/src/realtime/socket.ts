import { io, type Socket } from 'socket.io-client';
import { notifyUnauthorized } from '@/src/api/auth-events';
import { API_URL } from '@/src/config';
import type { Message } from '@/src/types/api';

/** Mismo nombre de evento que emite el gateway del backend. */
const MESSAGE_CREATED_EVENT = 'message:new';
/** El gateway lo emite y desconecta cuando falta el token o está vencido/inválido. */
const AUTH_ERROR_EVENT = 'auth:error';

type MessageListener = (message: Message) => void;

let socket: Socket | null = null;

/**
 * Los listeners viven acá y no en el socket a propósito: así una pantalla
 * puede suscribirse sin importarle si la conexión ya se estableció, y las
 * suscripciones sobreviven a una reconexión.
 */
const listeners = new Set<MessageListener>();

/**
 * Abre el canal de tiempo real autenticado con el mismo JWT del REST. Se
 * llama al iniciar sesión y al hidratar una sesión guardada (ver
 * `store/session.ts`), nunca desde un componente.
 */
export function connectSocket(token: string): void {
  disconnectSocket();

  // `transports: ['websocket']` fuerza el WS directo y saltea el long-polling
  // inicial de socket.io, que en React Native depende del XHR del runtime.
  const instance = io(API_URL, { auth: { token }, transports: ['websocket'] });

  instance.on(MESSAGE_CREATED_EVENT, (message: Message) => {
    for (const listener of listeners) {
      listener(message);
    }
  });

  // Mismo JWT que el REST: si el gateway lo rechaza, la sesión ya no sirve
  // aunque en ese momento no haya ninguna request HTTP en curso que lo note.
  instance.on(AUTH_ERROR_EVENT, () => {
    notifyUnauthorized();
  });

  socket = instance;
}

export function disconnectSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

/** Suscribe a los mensajes que llegan del server. Devuelve el unsubscribe. */
export function onMessageCreated(listener: MessageListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
