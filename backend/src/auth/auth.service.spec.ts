import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const buildFakeUser = async (password: string) => ({
    _id: { toString: () => 'user-1' },
    email: 'ana@example.com',
    passwordHash: await bcrypt.hash(password, 4),
    status: 'offline',
    lastSeenAt: null as Date | null,
    save: vi.fn().mockResolvedValue(undefined),
  });

  async function setup(fakeUser: unknown) {
    const usersService = {
      findByEmailWithPassword: vi.fn().mockResolvedValue(fakeUser),
    };
    const jwtService = { signAsync: vi.fn().mockResolvedValue('fake.jwt.token') };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    return { authService: moduleRef.get(AuthService), usersService, jwtService };
  }

  it('logs in with correct credentials, marks the user online and returns a token', async () => {
    const fakeUser = await buildFakeUser('Sup3rSecret!');
    const { authService } = await setup(fakeUser);

    const result = await authService.login('ana@example.com', 'Sup3rSecret!');

    expect(result.accessToken).toBe('fake.jwt.token');
    expect(result.user.status).toBe('online');
    expect(fakeUser.save).toHaveBeenCalledOnce();
  });

  it('rejects a wrong password without revealing which field was wrong', async () => {
    const fakeUser = await buildFakeUser('Sup3rSecret!');
    const { authService } = await setup(fakeUser);

    await expect(authService.login('ana@example.com', 'incorrecta')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects login for an email that does not exist', async () => {
    const { authService } = await setup(null);

    await expect(authService.login('nadie@example.com', 'cualquiera')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
