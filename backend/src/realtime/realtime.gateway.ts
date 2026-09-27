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
import { PresenceService } from './presence.service.js';

/** Evento que el server empuja a los participantes de un chat. */
export const MESSAGE_CREATED_EVENT = 'message:new';

/** Evento de presencia: alguien de tus contactos entró o salió. */
export const PRESENCE_CHANGED_EVENT = 'presence:changed';

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

  /**
   * Sockets vivos por usuario. Hace falta contarlos porque una misma persona
   * puede tener varias sesiones abiertas (el celular y la web en paralelo):
   * se marca "online" cuando llega la primera y "offline" recién cuando se va
   * la última, si no cerrar una pestaña la mostraría desconectada.
   */
  private readonly socketsByUser = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly presenceService: PresenceService,
  ) {}

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
      await this.trackConnection(payload.sub, client.id);
      this.logger.log(`Socket conectado: ${client.id} (user ${payload.sub})`);
    } catch {
      this.rejectConnection(client, 'Token inválido o expirado');
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      await this.trackDisconnection(userId, client.id);
    }
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

  /**
   * Avisa a los contactos del usuario que su presencia cambió. Es público
   * porque también lo usa el cambio manual de estado desde el perfil
   * (`UsersService.update`), para que los dos caminos se vean en vivo.
   */
  async emitPresenceChanged(userId: string): Promise<void> {
    if (!this.server) {
      return;
    }
    const presence = await this.presenceService.getPresence(userId);
    if (!presence) {
      return;
    }
    const contactIds = await this.presenceService.contactIdsOf(userId);
    for (const contactId of new Set(contactIds)) {
      this.server.to(userRoom(contactId)).emit(PRESENCE_CHANGED_EVENT, presence);
    }
  }

  private async trackConnection(userId: string, socketId: string): Promise<void> {
    const sockets = this.socketsByUser.get(userId);
    if (sockets) {
      // Ya estaba online por otra sesión: nada que persistir ni que avisar.
      sockets.add(socketId);
      return;
    }
    this.socketsByUser.set(userId, new Set([socketId]));
    await this.applyPresence(userId, 'online');
  }

  private async trackDisconnection(userId: string, socketId: string): Promise<void> {
    const sockets = this.socketsByUser.get(userId);
    if (!sockets) {
      return;
    }
    sockets.delete(socketId);
    if (sockets.size > 0) {
      // Le quedan otras sesiones abiertas: sigue online.
      return;
    }
    this.socketsByUser.delete(userId);
    await this.applyPresence(userId, 'offline');
  }

  /**
   * Un fallo escribiendo la presencia no puede tumbar el handler de
   * conexión/desconexión: se loguea y el chat sigue funcionando.
   */
  private async applyPresence(userId: string, status: 'online' | 'offline'): Promise<void> {
    try {
      const presence = await this.presenceService.setStatus(userId, status);
      if (presence) {
        await this.emitPresenceChanged(userId);
      }
    } catch (error) {
      this.logger.warn(`No se pudo actualizar la presencia de ${userId}: ${String(error)}`);
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
