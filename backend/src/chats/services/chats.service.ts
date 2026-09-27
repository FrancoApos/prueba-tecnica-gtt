import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, type UserDocument } from '../../users/schemas/user.schema.js';
import { ChatContactDto, ChatResponseDto } from '../dto/chat-response.dto.js';
import { Chat, type ChatDocument } from '../schemas/chat.schema.js';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel(Chat.name) private readonly chatModel: Model<ChatDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findOrCreate(userId: string, participantId: string): Promise<ChatResponseDto> {
    if (userId === participantId) {
      throw new ForbiddenException('No podés iniciar un chat con vos mismo');
    }

    const contactUser = await this.userModel.findById(participantId);
    if (!contactUser) {
      throw new NotFoundException('El usuario con el que querés chatear no existe');
    }

    const participantsKey = this.buildParticipantsKey(userId, participantId);
    let chat = await this.chatModel.findOne({ participantsKey });
    if (!chat) {
      chat = await this.chatModel.create({
        participants: [new Types.ObjectId(userId), new Types.ObjectId(participantId)],
        participantsKey,
        lastMessage: null,
      });
    }

    return this.toResponse(chat, contactUser);
  }

  async listForUser(userId: string): Promise<ChatResponseDto[]> {
    const chats = await this.chatModel
      .find({ participants: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .exec();

    if (chats.length === 0) {
      return [];
    }

    const contactIds = chats.map((chat) => this.otherParticipantId(chat, userId));
    const contacts = await this.userModel.find({ _id: { $in: contactIds } });
    const contactsById = new Map(contacts.map((contact) => [contact._id.toString(), contact]));

    return chats.map((chat) => {
      const contactId = this.otherParticipantId(chat, userId);
      const contact = contactsById.get(contactId);
      if (!contact) {
        // El contacto fue borrado pero el chat quedó huérfano: no debería
        // pasar en el flujo normal (no se hace cascade delete en este
        // alcance), lo señalamos en vez de romper el listado completo.
        throw new NotFoundException('El contacto de uno de los chats ya no existe');
      }
      return this.toResponse(chat, contact);
    });
  }

  async findByIdForUser(chatId: string, userId: string): Promise<ChatDocument> {
    const chat = await this.chatModel.findById(chatId);
    if (!chat) {
      throw new NotFoundException('Chat no encontrado');
    }
    this.assertParticipant(chat, userId);
    return chat;
  }

  async updateLastMessage(
    chatId: string,
    preview: { content: string | null; senderId: string; sentAt: Date },
  ): Promise<void> {
    await this.chatModel.updateOne(
      { _id: chatId },
      {
        lastMessage: {
          content: preview.content,
          senderId: new Types.ObjectId(preview.senderId),
          sentAt: preview.sentAt,
        },
      },
    );
  }

  assertParticipant(chat: ChatDocument, userId: string): void {
    const isParticipant = chat.participants.some((p) => p.toString() === userId);
    if (!isParticipant) {
      throw new ForbiddenException('No sos parte de este chat');
    }
  }

  private buildParticipantsKey(a: string, b: string): string {
    return [a, b].sort().join('_');
  }

  private otherParticipantId(chat: ChatDocument, userId: string): string {
    const other = chat.participants.find((p) => p.toString() !== userId);
    return (other ?? chat.participants[0]).toString();
  }

  private toResponse(chat: ChatDocument, contact: UserDocument): ChatResponseDto {
    const contactDto: ChatContactDto = {
      id: contact._id.toString(),
      firstName: contact.firstName,
      lastName: contact.lastName,
      avatarUrl: contact.avatarUrl,
      status: contact.status,
    };

    return {
      id: chat._id.toString(),
      contact: contactDto,
      lastMessage: chat.lastMessage
        ? {
            content: chat.lastMessage.content,
            senderId: chat.lastMessage.senderId.toString(),
            sentAt: chat.lastMessage.sentAt,
          }
        : null,
      createdAt: (chat as unknown as { createdAt: Date }).createdAt,
      updatedAt: (chat as unknown as { updatedAt: Date }).updatedAt,
    };
  }
}
