import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsPhoneNumber, IsString, MinLength } from 'class-validator';

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

  /**
   * La foto de perfil no está acá: no es un campo de texto, es un archivo, y
   * se sube aparte con `POST /users/:id/avatar` una vez que la cuenta existe
   * (el archivo se guarda con el id del dueño, así que necesita que ya haya
   * uno). Ver `docs/DECISIONS.md`.
   */
}
