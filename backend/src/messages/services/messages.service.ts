import { basename } from 'node:path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatsService } from '../../chats/services/chats.service.js';
import type { PaginatedResultDto } from '../../common/dto/paginated-result.dto.js';
import { RealtimeGateway } from '../../realtime/realtime.gateway.js';
import { CreateMessageDto } from '../dto/create-message.dto.js';
import { MessageResponseDto } from '../dto/message-response.dto.js';
import type { QueryMessagesDto } from '../dto/query-messages.dto.js';
import { Message, type MessageDocument } from '../schemas/message.schema.js';

/** Lo que necesita `AttachmentsController` para servir un adjunto. */
export interface StoredAttachment {
  /** Nombre del archivo en disco: el UUID que generó multer, no el del usuario. */
  storedName: string;
  /** Nombre original, el que ve y descarga el usuario. */
  filename: string;
  mimeType: string;
}

export interface UploadedAttachment {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * `expo/fetch` — el `fetch` que Expo instala en runtime nativo — pasa el nombre
 * del archivo por `encodeURIComponent` antes de ponerlo en el
 * `content-disposition` (ver `encodeFilename` en
 * `expo/src/winter/fetch/convertFormData.ts`), así que un "Informe final.docx"
 * llega acá como "Informe%20final.docx". Se decodifica para guardar el nombre
 * real y no mostrar los `%20` en la conversación. Si el nombre no es una
 * secuencia percent-encoded válida — un archivo llamado "50%.pdf", por ejemplo,
 * subido desde un cliente que no encodea — `decodeURIComponent` tira `URIError`
 * y se conserva tal cual vino.
 */
function decodeAttachmentName(originalname: string): string {
  try {
    return decodeURIComponent(originalname);
  } catch {
    return originalname;
  }
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    private readonly chatsService: ChatsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async create(
    chatId: string,
    senderId: string,
    dto: CreateMessageDto,
    file?: UploadedAttachment,
  ): Promise<MessageResponseDto> {
    const chat = await this.chatsService.findByIdForUser(chatId, senderId);

    const content = dto.content?.trim() || null;
    if (!content && !file) {
      throw new BadRequestException('El mensaje necesita texto, un adjunto, o ambos');
    }

    const attachment = file
      ? {
          url: `/uploads/${file.filename}`,
          filename: decodeAttachmentName(file.originalname),
          mimeType: file.mimetype,
          size: file.size,
        }
      : null;

    const sentAt = new Date();
    const created = await this.messageModel.create({
      chatId: chat._id,
      senderId: new Types.ObjectId(senderId),
      content,
      attachment,
      sentAt,
    });

    await this.chatsService.updateLastMessage(chat._id.toString(), {
      content,
      senderId,
      sentAt,
    });

    const response = MessageResponseDto.fromDocument(created);

    // El mensaje ya está persistido: recién ahora se empuja por WS, así lo que
    // ve el otro participante en vivo es exactamente lo que devuelve el REST.
    this.realtimeGateway.emitMessageCreated(
      chat.participants.map((participant) => participant.toString()),
      response,
    );

    return response;
  }

  /**
   * Resuelve un adjunto a partir del nombre con el que quedó guardado en disco.
   * Devuelve `storedName` derivado de la URL que armó el propio servidor (un
   * UUID, ver `messages.module.ts`) y no del segmento crudo de la request: así
   * el controller no puede terminar armando un path fuera de `uploads/`.
   */
  async findAttachment(storedName: string): Promise<StoredAttachment> {
    const doc = await this.messageModel.findOne({ 'attachment.url': `/uploads/${storedName}` }).exec();
    if (!doc?.attachment) {
      throw new NotFoundException('Adjunto no encontrado');
    }

    return {
      storedName: basename(doc.attachment.url),
      filename: doc.attachment.filename,
      mimeType: doc.attachment.mimeType,
    };
  }

  async findByChat(
    chatId: string,
    requesterId: string,
    query: QueryMessagesDto,
  ): Promise<PaginatedResultDto<MessageResponseDto>> {
    await this.chatsService.findByIdForUser(chatId, requesterId);

    const skip = (query.page - 1) * query.limit;
    const [docs, total] = await Promise.all([
      this.messageModel.find({ chatId }).sort({ sentAt: 1 }).skip(skip).limit(query.limit).exec(),
      this.messageModel.countDocuments({ chatId }),
    ]);

    return {
      data: docs.map((doc) => MessageResponseDto.fromDocument(doc)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
