import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista usuarios con filtro de texto, paginado y orden (directorio, para iniciar chats)' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Elimina una cuenta',
    description: 'Cualquiera puede eliminar la propia cuenta. Eliminar la de otro usuario requiere rol "admin".',
  })
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
