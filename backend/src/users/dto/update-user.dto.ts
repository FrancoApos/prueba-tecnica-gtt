import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';
import type { ConnectionStatus } from '../schemas/user.schema.js';

/**
 * Todos los campos de alta son opcionales al editar, salvo la contraseña
 * (cambiarla es un flujo aparte, fuera de este alcance) y el email
 * (se valida único al crear; permitir editarlo suma complejidad de
 * re-validación sin pedirlo la consigna).
 *
 * La foto de perfil tampoco se toca por acá: es un archivo y tiene sus
 * propias rutas (`POST`/`DELETE /users/:id/avatar`). Que `avatarUrl` no sea
 * escribible por el cliente es deliberado — el valor lo arma el servidor y
 * apunta a un archivo que él mismo guardó; si el cliente pudiera setearlo,
 * podría apuntarlo a cualquier path del servidor o a un host arbitrario.
 */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password', 'email'] as const)) {
  @ApiPropertyOptional({ enum: ['online', 'offline'], example: 'offline' })
  @IsOptional()
  @IsEnum(['online', 'offline'])
  status?: ConnectionStatus;
}
