import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  email!: string;

  /**
   * A propósito sin `@MinLength(8)` (sí está en `CreateUserDto`, que es donde
   * se define la política): validar el largo acá haría que una contraseña
   * corta devuelva un 400 "debe tener al menos 8 caracteres" en vez del 401
   * genérico. Eso le publica la política a alguien sin autenticar y, peor,
   * distingue dos casos que para quien intenta entrar son el mismo: credencial
   * incorrecta. Lo único que se exige es que venga algo.
   */
  @ApiProperty({ example: 'S3curePass!' })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string;
}
