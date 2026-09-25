import { ApiProperty } from '@nestjs/swagger';
import type { ConnectionStatus } from '../schemas/user.schema.js';
import type { UserDocument } from '../schemas/user.schema.js';

export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() birthDate!: Date;
  @ApiProperty() phone!: string;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ enum: ['online', 'offline'] }) status!: ConnectionStatus;
  @ApiProperty({ nullable: true }) lastSeenAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;

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
    dto.createdAt = (doc as unknown as { createdAt: Date }).createdAt;
    dto.updatedAt = (doc as unknown as { updatedAt: Date }).updatedAt;
    return dto;
  }
}
