import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PaginatedResultDto } from '../../common/dto/paginated-result.dto.js';
import { CreateMessageDto } from '../dto/create-message.dto.js';
import { MessageResponseDto } from '../dto/message-response.dto.js';
import { QueryMessagesDto } from '../dto/query-messages.dto.js';
import { MessagesService } from '../services/messages.service.js';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats/:chatId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Envía un mensaje (texto, adjunto, o ambos) y actualiza el chat' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', example: 'Hola Bruno!' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Mensaje creado', type: MessageResponseDto })
  create(
    @Param('chatId') chatId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() currentUser: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<MessageResponseDto> {
    return this.messagesService.create(chatId, currentUser.id, dto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Historial de mensajes de un chat, paginado y ordenado cronológicamente' })
  @ApiOkResponse({ description: 'Página de mensajes', type: PaginatedResultDto })
  findAll(
    @Param('chatId') chatId: string,
    @Query() query: QueryMessagesDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<PaginatedResultDto<MessageResponseDto>> {
    return this.messagesService.findByChat(chatId, currentUser.id, query);
  }
}
