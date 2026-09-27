import { ApiProperty } from '@nestjs/swagger';

export class ChatContactDto {
  @ApiProperty({ example: '6ab929cee976f98327c30ae6' }) id!: string;
  @ApiProperty({ example: 'Bruno' }) firstName!: string;
  @ApiProperty({ example: 'Díaz' }) lastName!: string;
  @ApiProperty({ example: null, nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ enum: ['online', 'offline'], example: 'offline' }) status!: 'online' | 'offline';
}

export class LastMessagePreviewDto {
  @ApiProperty({ example: 'Hola Bruno!', nullable: true }) content!: string | null;
  @ApiProperty({ example: '6ab929cee976f98327c30ae5' }) senderId!: string;
  @ApiProperty({ example: '2026-09-27T14:35:58.470Z' }) sentAt!: Date;
}

export class ChatResponseDto {
  @ApiProperty({ example: '6ab929cee976f98327c30ae8' }) id!: string;
  @ApiProperty({ type: ChatContactDto })
  contact!: ChatContactDto;
  @ApiProperty({ type: LastMessagePreviewDto, nullable: true })
  lastMessage!: LastMessagePreviewDto | null;
  @ApiProperty({ example: '2026-09-27T14:35:58.467Z' }) createdAt!: Date;
  @ApiProperty({ example: '2026-09-27T14:35:58.474Z' }) updatedAt!: Date;
}
