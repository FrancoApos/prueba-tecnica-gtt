import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { MessageResponseDto } from '../messages/dto/message-response.dto.js';

/** Evento que el server empuja a los participantes de un chat. */
export const MESSAGE_CREATED_EVENT = 'message:new';

interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * Canal de tiempo real del chat. El transporte HTTP (REST) sigue siendo la
 * fuente de verdad: el mensaje se persiste vía `POST /chats/:id/messages` y el
 * gateway solo lo *empuja* a los otros participantes para que no tengan que
 * recargar. Así el WS es una mejora de UX y no un segundo camino de escritura
 * que haya que validar y autorizar por separado.
 *
 * El origen de CORS se lee de `process.env` y no del ConfigService porque las
 * opciones del decorador se evalúan al definir la clase, antes de que exista
 * el contenedor de DI.
 */
@WebSocketGateway({ cors: { origin: process.env.CORS_ORIGIN ?? '*' } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private readonly server?: Server;

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Autenticación del socket con el mismo JWT del REST. Se valida en el
   * handshake (no por evento) y el cliente queda en una room propia
   * `user:<id>`, que es la unidad a la que después se emite.
   */
  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      this.rejectConnection(client, 'Falta el token de autenticación');
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      client.data.userId = payload.sub;
      await client.join(userRoom(payload.sub));
      this.logger.log(`Socket conectado: ${client.id} (user ${payload.sub})`);
    } catch {
      this.rejectConnection(client, 'Token inválido o expirado');
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = client.data.userId as string | undefined;
    this.logger.log(`Socket desconectado: ${client.id}${userId ? ` (user ${userId})` : ''}`);
  }

  /**
   * Empuja un mensaje recién creado a todos los participantes del chat,
   * incluido el remitente: sus otras sesiones (otro dispositivo, o la web
   * abierta en paralelo) también tienen que verlo. El cliente deduplica por
   * id, así que recibirlo de vuelta no duplica la burbuja.
   */
  emitMessageCreated(participantIds: string[], message: MessageResponseDto): void {
    if (!this.server) {
      // En tests que solo hacen `app.init()` no hay servidor WS adjunto.
      return;
    }
    for (const participantId of new Set(participantIds)) {
      this.server.to(userRoom(participantId)).emit(MESSAGE_CREATED_EVENT, message);
    }
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth.length > 0) {
      return fromAuth;
    }
    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    return null;
  }

  private rejectConnection(client: Socket, reason: string): void {
    client.emit('auth:error', { message: reason });
    client.disconnect(true);
  }
}

function userRoom(userId: string): string {
  return `user:${userId}`;
}
