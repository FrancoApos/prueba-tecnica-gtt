import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({
    description: 'Id del otro usuario con el que se quiere chatear',
    example: '6ab929cee976f98327c30ae5',
  })
  @IsMongoId()
  participantId!: string;
}
