import { ApiProperty } from '@nestjs/swagger';
import type { MessageDocument } from '../schemas/message.schema.js';

export class MessageAttachmentDto {
  @ApiProperty() url!: string;
  @ApiProperty() filename!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() size!: number;
}

export class MessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() chatId!: string;
  @ApiProperty() senderId!: string;
  @ApiProperty({ nullable: true }) content!: string | null;
  @ApiProperty({ type: MessageAttachmentDto, nullable: true })
  attachment!: MessageAttachmentDto | null;
  @ApiProperty() sentAt!: Date;

  static fromDocument(doc: MessageDocument): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = doc._id.toString();
    dto.chatId = doc.chatId.toString();
    dto.senderId = doc.senderId.toString();
    dto.content = doc.content;
    dto.attachment = doc.attachment
      ? {
          url: doc.attachment.url,
          filename: doc.attachment.filename,
          mimeType: doc.attachment.mimeType,
          size: doc.attachment.size,
        }
      : null;
    dto.sentAt = doc.sentAt;
    return dto;
  }
}
