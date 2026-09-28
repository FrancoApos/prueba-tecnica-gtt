import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AVATAR_ACCEPTED_MIMES } from '../avatar-storage.js';
import { PaginatedResultDto } from '../../common/dto/paginated-result.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { QueryUsersDto } from '../dto/query-users.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { UserResponseDto } from '../dto/user-response.dto.js';
import { UsersService } from '../services/users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Crea una cuenta de usuario (alta de cuenta / "registro")',
    description:
      'No hay una pantalla de registro dedicada en la app móvil (la consigna solo pide login) — este endpoint es el alta de cuenta, usado para crear los usuarios de prueba. Siempre crea la cuenta con rol "user"; no acepta rol en el body.',
  })
  @ApiCreatedResponse({ description: 'Cuenta creada', type: UserResponseDto })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista usuarios con filtro de texto, paginado y orden (directorio, para iniciar chats)' })
  @ApiOkResponse({ description: 'Página de usuarios', type: PaginatedResultDto })
  findAll(@Query() query: QueryUsersDto): Promise<PaginatedResultDto<UserResponseDto>> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ description: 'Usuario encontrado', type: UserResponseDto })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return UserResponseDto.fromDocument(await this.usersService.findById(id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Edita un perfil (nombre, apellido, fecha de nacimiento, teléfono, estado de conexión)',
    description:
      'Cualquiera puede editar el propio perfil. Editar el de otro usuario requiere rol "admin". La foto va por `POST /users/:id/avatar`.',
  })
  @ApiOkResponse({ description: 'Usuario actualizado', type: UserResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  /**
   * Mismo control de acceso que `PATCH`/`DELETE /users/:id`: el `RolesGuard`
   * lee el `:id` de la ruta, así que "cada quien cambia su propia foto, y un
   * admin la de cualquiera" sale sin lógica extra.
   */
  @Post(':id/avatar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Sube (o reemplaza) la foto de perfil',
    description: `Formatos aceptados: ${AVATAR_ACCEPTED_MIMES.join(', ')}. La foto anterior se borra del disco. Cualquiera puede cambiar la propia; la de otro usuario requiere rol "admin".`,
  })
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOkResponse({ description: 'Usuario con la nueva `avatarUrl`', type: UserResponseDto })
  setAvatar(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File): Promise<UserResponseDto> {
    if (!file) {
      throw new BadRequestException('Falta el archivo de la foto (campo "file" del form-data)');
    }
    return this.usersService.setAvatar(id, file);
  }

  @Delete(':id/avatar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Quita la foto de perfil (vuelve a las iniciales)',
    description: 'Borra el archivo del disco y deja `avatarUrl` en `null`.',
  })
  @ApiOkResponse({ description: 'Usuario sin foto', type: UserResponseDto })
  removeAvatar(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.removeAvatar(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Elimina una cuenta',
    description: 'Cualquiera puede eliminar la propia cuenta. Eliminar la de otro usuario requiere rol "admin".',
  })
  @ApiNoContentResponse({ description: 'Cuenta eliminada' })
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
