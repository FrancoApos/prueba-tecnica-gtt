import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatsService } from '../chats/services/chats.service.js';
import { User, type ConnectionStatus, type UserDocument } from '../users/schemas/user.schema.js';

/** Lo que se emite (y lo que el cliente aplica) cuando alguien entra o sale. */
export interface PresenceUpdate {
  userId: string;
  status: ConnectionStatus;
  lastSeenAt: Date | null;
}

/**
 * Presencia de los usuarios: la escritura en la base y el cálculo de a quién
 * hay que avisarle. Vive en el módulo de realtime (y no en UsersService) para
 * que UsersModule pueda depender de este módulo sin crear un ciclo: el cambio
 * manual de estado desde el perfil también necesita emitir por el gateway.
 */
@Injectable()
export class PresenceService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly chatsService: ChatsService,
  ) {}

  async setStatus(userId: string, status: ConnectionStatus): Promise<PresenceUpdate | null> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { status, lastSeenAt: new Date() },
      { new: true },
    );
    return user ? toPresenceUpdate(user) : null;
  }

  async getPresence(userId: string): Promise<PresenceUpdate | null> {
    const user = await this.userModel.findById(userId);
    return user ? toPresenceUpdate(user) : null;
  }

  /** Solo se le avisa a los contactos: quien no tiene un chat con vos no ve tu presencia. */
  contactIdsOf(userId: string): Promise<string[]> {
    return this.chatsService.listContactIds(userId);
  }
}

function toPresenceUpdate(user: UserDocument): PresenceUpdate {
  return { userId: user._id.toString(), status: user.status, lastSeenAt: user.lastSeenAt };
}
