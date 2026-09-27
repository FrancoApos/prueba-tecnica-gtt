import { ApiProperty } from '@nestjs/swagger';
import type { ConnectionStatus, UserRole } from '../schemas/user.schema.js';
import type { UserDocument } from '../schemas/user.schema.js';

export class UserResponseDto {
  @ApiProperty({ example: '6ab929cee976f98327c30ae5' }) id!: string;
  @ApiProperty({ example: 'ana@example.com' }) email!: string;
  @ApiProperty({ example: 'Ana' }) firstName!: string;
  @ApiProperty({ example: 'García' }) lastName!: string;
  @ApiProperty({ example: '1995-03-20T00:00:00.000Z' }) birthDate!: Date;
  @ApiProperty({ example: '+5491122334455' }) phone!: string;
  @ApiProperty({ example: null, nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ enum: ['online', 'offline'], example: 'online' }) status!: ConnectionStatus;
  @ApiProperty({ example: '2026-09-27T14:38:47.438Z', nullable: true }) lastSeenAt!: Date | null;
  @ApiProperty({ enum: ['user', 'admin'], example: 'user' }) role!: UserRole;
  @ApiProperty({ example: '2026-09-27T14:35:58.289Z' }) createdAt!: Date;
  @ApiProperty({ example: '2026-09-27T14:38:47.440Z' }) updatedAt!: Date;

  /** Mapea un documento de Mongoose a la forma pública (nunca expone `passwordHash`). */
  static fromDocument(doc: UserDocument): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = doc._id.toString();
    dto.email = doc.email;
    dto.firstName = doc.firstName;
    dto.lastName = doc.lastName;
    dto.birthDate = doc.birthDate;
    dto.phone = doc.phone;
    dto.avatarUrl = doc.avatarUrl;
    dto.status = doc.status;
    dto.lastSeenAt = doc.lastSeenAt;
    dto.role = doc.role;
    dto.createdAt = (doc as unknown as { createdAt: Date }).createdAt;
    dto.updatedAt = (doc as unknown as { updatedAt: Date }).updatedAt;
    return dto;
  }
}
