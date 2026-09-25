import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({ description: 'Id del otro usuario con el que se quiere chatear' })
  @IsMongoId()
  participantId!: string;
}
