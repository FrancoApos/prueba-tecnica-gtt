import { ApiPropertyOptional } from '@nestjs/swagger';
import { OmitType, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUrl } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';
import type { ConnectionStatus } from '../schemas/user.schema.js';

/**
 * Todos los campos de alta son opcionales al editar, salvo la contraseña
 * (cambiarla es un flujo aparte, fuera de este alcance) y el email
 * (se valida único al crear; permitir editarlo suma complejidad de
 * re-validación sin pedirlo la consigna).
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'email', 'avatarUrl'] as const),
) {
  /**
   * `avatarUrl` se omite de la base y se declara acá para poder admitir `null`
   * explícito, que es cómo se quita la foto actual — en `CreateUserDto` el
   * tipo es `string | undefined`, y omitir la clave significa "no tocar", no
   * "borrar". TypeScript no deja ensanchar el tipo de una propiedad heredada,
   * de ahí el `OmitType`. `@IsOptional()` de class-validator ignora los
   * validadores cuando el valor es `null` o `undefined`, así que `@IsUrl()`
   * solo corre sobre una URL de verdad.
   */
  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    nullable: true,
    description: 'URL de la foto. `null` quita la actual; omitir el campo la deja como está.',
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string | null;

  @ApiPropertyOptional({ enum: ['online', 'offline'], example: 'offline' })
  @IsOptional()
  @IsEnum(['online', 'offline'])
  status?: ConnectionStatus;
}
