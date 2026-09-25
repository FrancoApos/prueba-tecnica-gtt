import { ApiProperty } from '@nestjs/swagger';

export class ChatContactDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ enum: ['online', 'offline'] }) status!: 'online' | 'offline';
}

export class LastMessagePreviewDto {
  @ApiProperty({ nullable: true }) content!: string | null;
  @ApiProperty() senderId!: string;
  @ApiProperty() sentAt!: Date;
}

export class ChatResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: ChatContactDto })
  contact!: ChatContactDto;
  @ApiProperty({ type: LastMessagePreviewDto, nullable: true })
  lastMessage!: LastMessagePreviewDto | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
