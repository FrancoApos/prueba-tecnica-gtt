import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ChatsService } from '../chats/chats.service.js';
import { MessagesService } from './messages.service.js';
import { Message } from './schemas/message.schema.js';

describe('MessagesService', () => {
  async function setup(messageModel: Record<string, unknown>, chatsService: Record<string, unknown>) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: getModelToken(Message.name), useValue: messageModel },
        { provide: ChatsService, useValue: chatsService },
      ],
    }).compile();

    return moduleRef.get(MessagesService);
  }

  const fakeChat = { _id: { toString: () => 'chat-1' } };

  const senderId = '507f1f77bcf86cd799439011';

  it('rejects a message with neither text nor attachment', async () => {
    const messageModel = { create: vi.fn() };
    const chatsService = { findByIdForUser: vi.fn().mockResolvedValue(fakeChat) };
    const messagesService = await setup(messageModel, chatsService);

    await expect(messagesService.create('chat-1', senderId, {})).rejects.toThrow(BadRequestException);
    expect(messageModel.create).not.toHaveBeenCalled();
  });

  it('accepts a message with only an attachment (no text)', async () => {
    const created = { _id: { toString: () => 'msg-1' }, chatId: { toString: () => 'chat-1' }, senderId: { toString: () => senderId }, content: null, attachment: { url: '/uploads/a.png', filename: 'a.png', mimeType: 'image/png', size: 10 }, sentAt: new Date() };
    const messageModel = { create: vi.fn().mockResolvedValue(created) };
    const chatsService = { findByIdForUser: vi.fn().mockResolvedValue(fakeChat), updateLastMessage: vi.fn().mockResolvedValue(undefined) };
    const messagesService = await setup(messageModel, chatsService);

    const file = { filename: 'stored-a.png', originalname: 'a.png', mimetype: 'image/png', size: 10 };
    const result = await messagesService.create('chat-1', senderId, {}, file);

    expect(result.attachment?.url).toBe('/uploads/a.png');
    expect(chatsService.updateLastMessage).toHaveBeenCalledOnce();
  });

  it('treats whitespace-only content as empty, same as no text', async () => {
    const messageModel = { create: vi.fn() };
    const chatsService = { findByIdForUser: vi.fn().mockResolvedValue(fakeChat) };
    const messagesService = await setup(messageModel, chatsService);

    await expect(messagesService.create('chat-1', senderId, { content: '   ' })).rejects.toThrow(
      BadRequestException,
    );
    expect(messageModel.create).not.toHaveBeenCalled();
  });
});
