import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * `lastSeenAt` habilita el orden "Recently active" del listado de usuarios.
 * Es nullable (un usuario que nunca se conectó lo tiene en `null`) y en Mongo
 * `null` ordena por debajo de cualquier fecha, así que en `desc` esos usuarios
 * quedan al final, que es lo que se espera de "actividad reciente".
 */
const SORTABLE_FIELDS = ['firstName', 'lastName', 'email', 'createdAt', 'lastSeenAt'] as const;
type SortableField = (typeof SORTABLE_FIELDS)[number];

export class QueryUsersDto {
  @ApiPropertyOptional({ description: 'Busca por nombre, apellido o email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;

  @ApiPropertyOptional({ enum: SORTABLE_FIELDS, default: 'lastName' })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy: SortableField = 'lastName';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';
}
