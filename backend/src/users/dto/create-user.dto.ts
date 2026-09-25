import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'S3curePass!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'García' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: '1995-03-20' })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({ example: '+5491122334455' })
  @IsPhoneNumber(undefined, { message: 'Teléfono inválido' })
  phone!: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
