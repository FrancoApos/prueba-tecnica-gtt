import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { ChatsService } from './chats.service.js';
import { ChatResponseDto } from './dto/chat-response.dto.js';
import { CreateChatDto } from './dto/create-chat.dto.js';

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  @ApiOperation({ summary: 'Abre (o reutiliza) el chat 1 a 1 con otro usuario' })
  create(
    @Body() dto: CreateChatDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<ChatResponseDto> {
    return this.chatsService.findOrCreate(currentUser.id, dto.participantId);
  }

  @Get()
  @ApiOperation({ summary: 'Lista los chats del usuario autenticado, más recientes primero' })
  findAll(@CurrentUser() currentUser: AuthenticatedUser): Promise<ChatResponseDto[]> {
    return this.chatsService.listForUser(currentUser.id);
  }
}
