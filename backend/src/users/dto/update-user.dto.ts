import { ApiPropertyOptional } from '@nestjs/swagger';
import { OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';
import type { ConnectionStatus } from '../schemas/user.schema.js';

/**
 * Todos los campos de alta son opcionales al editar, salvo la contraseña
 * (cambiarla es un flujo aparte, fuera de este alcance) y el email
 * (se valida único al crear; permitir editarlo suma complejidad de
 * re-validación sin pedirlo la consigna).
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'email'] as const),
) {
  @ApiPropertyOptional({ enum: ['online', 'offline'] })
  @IsOptional()
  @IsEnum(['online', 'offline'])
  status?: ConnectionStatus;
}
