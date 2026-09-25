import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiPropertyOptional({ example: 'Hola, ¿cómo estás?' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;
}
