import {
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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PaginatedResultDto } from '../common/dto/paginated-result.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';

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
    summary: 'Edita un perfil (nombre, teléfono, avatar, estado de conexión, etc.)',
    description: 'Cualquiera puede editar el propio perfil. Editar el de otro usuario requiere rol "admin".',
  })
  @ApiOkResponse({ description: 'Usuario actualizado', type: UserResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
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
