import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT a enviar como "Authorization: Bearer <token>"',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YWI5MjljZWU5NzZmOTgzMjdjMzBhZTUiLCJlbWFpbCI6ImFuYUBleGFtcGxlLmNvbSJ9.7OESOWSQ__on6E-Vx53-0bswk20PcRbsCOkAzd1oOms',
  })
  accessToken!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
