import { ApiProperty } from '@nestjs/swagger';
import type { MessageDocument } from '../schemas/message.schema.js';

export class MessageAttachmentDto {
  @ApiProperty({ example: '/uploads/8c3e1b2a-1f3d-4b7a-9c0e-2a1b3c4d5e6f.png' }) url!: string;
  @ApiProperty({ example: 'foto.png' }) filename!: string;
  @ApiProperty({ example: 'image/png' }) mimeType!: string;
  @ApiProperty({ example: 245678 }) size!: number;
}

export class MessageResponseDto {
  @ApiProperty({ example: '6ab929cee976f98327c30b01' }) id!: string;
  @ApiProperty({ example: '6ab929cee976f98327c30ae8' }) chatId!: string;
  @ApiProperty({ example: '6ab929cee976f98327c30ae5' }) senderId!: string;
  @ApiProperty({ example: 'Hola Bruno!', nullable: true }) content!: string | null;
  @ApiProperty({ type: MessageAttachmentDto, nullable: true })
  attachment!: MessageAttachmentDto | null;
  @ApiProperty({ example: '2026-09-27T14:35:58.470Z' }) sentAt!: Date;

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
