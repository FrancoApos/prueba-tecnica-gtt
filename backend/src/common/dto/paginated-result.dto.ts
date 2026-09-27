import { ApiProperty } from '@nestjs/swagger';

/**
 * `data` no lleva un tipo concreto en el schema (es genérica: la usan tanto
 * `GET /users` como `GET /chats/:chatId/messages`, cada uno con su propio
 * DTO) — Swagger la documenta como array de objeto; el shape real de cada
 * item es el `UserResponseDto`/`MessageResponseDto` del endpoint correspondiente.
 */
export class PaginatedResultDto<T> {
  @ApiProperty({ type: [Object] })
  data!: T[];

  @ApiProperty({ example: 2 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
