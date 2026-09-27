import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { User } from '../../users/schemas/user.schema.js';
import { ChatsService } from './chats.service.js';
import { Chat } from '../schemas/chat.schema.js';

describe('ChatsService', () => {
  async function setup(chatModel: Record<string, unknown>, userModel: Record<string, unknown>) {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChatsService,
        { provide: getModelToken(Chat.name), useValue: chatModel },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    return moduleRef.get(ChatsService);
  }

  it('does not allow a user to start a chat with themselves', async () => {
    const chatsService = await setup({}, {});

    await expect(chatsService.findOrCreate('user-1', 'user-1')).rejects.toThrow(ForbiddenException);
  });

  it('fails when the other participant does not exist', async () => {
    const userModel = { findById: vi.fn().mockResolvedValue(null) };
    const chatsService = await setup({}, userModel);

    await expect(chatsService.findOrCreate('user-1', 'user-2')).rejects.toThrow(NotFoundException);
  });

  it('reuses an existing chat instead of creating a duplicate for the same pair', async () => {
    const existingChat = { _id: 'chat-1', lastMessage: null };
    const contact = { _id: { toString: () => 'user-2' }, firstName: 'Bruno', lastName: 'Diaz', avatarUrl: null, status: 'offline' };
    const chatModel = {
      findOne: vi.fn().mockResolvedValue(existingChat),
      create: vi.fn(),
    };
    const userModel = { findById: vi.fn().mockResolvedValue(contact) };
    const chatsService = await setup(chatModel, userModel);

    const result = await chatsService.findOrCreate('user-1', 'user-2');

    expect(chatModel.create).not.toHaveBeenCalled();
    expect(result.id).toBe('chat-1');
    // Mismo par sin importar el orden en que se pasen los ids.
    expect(chatModel.findOne).toHaveBeenCalledWith({ participantsKey: 'user-1_user-2' });
  });

  it('rejects access to a chat for someone who is not a participant', async () => {
    const chatsService = await setup({}, {});
    const chat = { participants: [{ toString: () => 'user-1' }, { toString: () => 'user-2' }] } as never;

    expect(() => chatsService.assertParticipant(chat, 'user-3')).toThrow(ForbiddenException);
  });
});
