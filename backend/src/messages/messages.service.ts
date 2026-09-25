import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatsService } from '../chats/chats.service.js';
import type { PaginatedResultDto } from '../common/dto/paginated-result.dto.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { MessageResponseDto } from './dto/message-response.dto.js';
import type { QueryMessagesDto } from './dto/query-messages.dto.js';
import { Message, type MessageDocument } from './schemas/message.schema.js';

export interface UploadedAttachment {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    private readonly chatsService: ChatsService,
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
          filename: file.originalname,
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

    return MessageResponseDto.fromDocument(created);
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
