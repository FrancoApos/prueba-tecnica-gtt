import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { User } from './schemas/user.schema.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  const validDto = {
    email: 'ana@example.com',
    password: 'Sup3rSecret!',
    firstName: 'Ana',
    lastName: 'García',
    birthDate: '1995-03-20',
    phone: '+5491122334455',
  };

  async function setup(userModel: Record<string, unknown>) {
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: getModelToken(User.name), useValue: userModel }],
    }).compile();

    return moduleRef.get(UsersService);
  }

  it('hashes the password and never stores it in plain text', async () => {
    const created = { _id: { toString: () => 'user-1' }, ...validDto, avatarUrl: null, status: 'offline', lastSeenAt: null, role: 'user', createdAt: new Date(), updatedAt: new Date() };
    const userModel = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((doc: Record<string, unknown>) => ({ ...created, ...doc })),
    };
    const usersService = await setup(userModel);

    await usersService.create(validDto);

    const createdDoc = userModel.create.mock.calls[0][0] as { passwordHash: string; role?: unknown };
    expect(createdDoc.passwordHash).not.toBe(validDto.password);
    expect(createdDoc.passwordHash.length).toBeGreaterThan(20);
  });

  it('never accepts a role in the create payload (always defaults to "user")', async () => {
    const created = { _id: { toString: () => 'user-1' }, ...validDto, avatarUrl: null, status: 'offline', lastSeenAt: null, role: 'user', createdAt: new Date(), updatedAt: new Date() };
    const userModel = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((doc: Record<string, unknown>) => ({ ...created, ...doc })),
    };
    const usersService = await setup(userModel);

    // CreateUserDto no tiene `role` — ni siquiera pasándolo debería colarse.
    await usersService.create({ ...validDto, role: 'admin' } as never);

    const createdDoc = userModel.create.mock.calls[0][0] as Record<string, unknown>;
    expect(createdDoc.role).toBeUndefined();
  });

  it('rejects creating a user with an email that is already taken', async () => {
    const userModel = {
      findOne: vi.fn().mockResolvedValue({ _id: 'existing' }),
      create: vi.fn(),
    };
    const usersService = await setup(userModel);

    await expect(usersService.create(validDto)).rejects.toThrow(ConflictException);
    expect(userModel.create).not.toHaveBeenCalled();
  });
});
