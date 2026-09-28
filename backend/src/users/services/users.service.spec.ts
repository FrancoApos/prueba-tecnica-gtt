import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { rm } from 'node:fs/promises';
import { User } from '../schemas/user.schema.js';
import { RealtimeGateway } from '../../realtime/realtime.gateway.js';
import { UsersService } from './users.service.js';

// El borrado del archivo anterior es parte del contrato de `setAvatar`
// (si no, cada cambio de foto deja un huérfano en disco), así que se mockea
// el fs para poder afirmar sobre él sin tocar el disco real.
vi.mock('node:fs/promises', () => ({ rm: vi.fn().mockResolvedValue(undefined) }));

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
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: RealtimeGateway, useValue: { emitPresenceChanged: vi.fn().mockResolvedValue(undefined) } },
        { provide: ConfigService, useValue: { get: () => 'uploads' } },
      ],
    }).compile();

    return moduleRef.get(UsersService);
  }

  beforeEach(() => {
    vi.mocked(rm).mockClear();
  });

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

  it('passes the requested sort through to the query (incluye lastSeenAt, el orden "Recently active")', async () => {
    const chain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };
    const userModel = {
      find: vi.fn().mockReturnValue(chain),
      countDocuments: vi.fn().mockResolvedValue(0),
    };
    const usersService = await setup(userModel);

    await usersService.findAll({ page: 1, limit: 20, sortBy: 'lastSeenAt', sortOrder: 'desc' });
    expect(chain.sort).toHaveBeenCalledWith({ lastSeenAt: -1 });

    await usersService.findAll({ page: 1, limit: 20, sortBy: 'lastName', sortOrder: 'asc' });
    expect(chain.sort).toHaveBeenLastCalledWith({ lastName: 1 });
  });

  it('escapes regex metacharacters in the search filter (e.g. an unescaped "(" would 500 on an invalid regex)', async () => {
    const chain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };
    const userModel = {
      find: vi.fn().mockReturnValue(chain),
      countDocuments: vi.fn().mockResolvedValue(0),
    };
    const usersService = await setup(userModel);

    await usersService.findAll({ search: 'a(b', page: 1, limit: 20, sortBy: 'lastName', sortOrder: 'asc' });

    const filter = userModel.find.mock.calls[0][0] as { $or: Array<{ firstName?: { $regex: string } }> };
    expect(filter.$or[0].firstName?.$regex).toBe('a\\(b');
  });

  describe('foto de perfil', () => {
    /** Documento mínimo de Mongoose: lo que tocan los métodos de avatar. */
    function userDoc(avatarUrl: string | null) {
      return {
        _id: { toString: () => 'user-1' },
        ...validDto,
        birthDate: new Date(validDto.birthDate),
        avatarUrl,
        status: 'offline',
        lastSeenAt: null,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(undefined),
      };
    }

    it('guarda la foto nueva y borra el archivo de la anterior', async () => {
      const doc = userDoc('/uploads/avatars/vieja.png');
      const usersService = await setup({ findById: vi.fn().mockResolvedValue(doc) });

      const result = await usersService.setAvatar('user-1', { filename: 'nueva.jpg' });

      expect(result.avatarUrl).toBe('/uploads/avatars/nueva.jpg');
      expect(doc.save).toHaveBeenCalled();
      // El huérfano es el punto: sin este borrado, cada cambio de foto deja
      // un archivo más en disco que ya nadie referencia.
      expect(vi.mocked(rm).mock.calls[0][0]).toContain('vieja.png');
    });

    it('no intenta borrar nada si el usuario todavía no tenía foto', async () => {
      const doc = userDoc(null);
      const usersService = await setup({ findById: vi.fn().mockResolvedValue(doc) });

      await usersService.setAvatar('user-1', { filename: 'nueva.jpg' });

      expect(rm).not.toHaveBeenCalled();
    });

    it('al quitar la foto deja avatarUrl en null y borra el archivo', async () => {
      const doc = userDoc('/uploads/avatars/vieja.png');
      const usersService = await setup({ findById: vi.fn().mockResolvedValue(doc) });

      const result = await usersService.removeAvatar('user-1');

      expect(result.avatarUrl).toBeNull();
      expect(vi.mocked(rm).mock.calls[0][0]).toContain('vieja.png');
    });

    it('borra la foto al eliminar la cuenta (si no, queda huérfana para siempre)', async () => {
      const usersService = await setup({
        findByIdAndDelete: vi.fn().mockResolvedValue({ avatarUrl: '/uploads/avatars/vieja.png' }),
      });

      await usersService.remove('user-1');

      expect(vi.mocked(rm).mock.calls[0][0]).toContain('vieja.png');
    });

    it('sirve la foto solo si hay un usuario que la referencia', async () => {
      const usersService = await setup({
        findOne: vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue(null) }),
      });

      await expect(usersService.findAvatar('no-referenciada.png')).rejects.toThrow(NotFoundException);
    });

    it('resuelve el nombre en disco desde lo que guardó el servidor, no desde la URL pedida', async () => {
      const findOne = vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue({ avatarUrl: '/uploads/avatars/real.webp' }),
      });
      const usersService = await setup({ findOne });

      // Un intento de path traversal: aunque el segmento venga con `../`, el
      // nombre que se devuelve sale del documento, no del pedido.
      const avatar = await usersService.findAvatar('../../etc/passwd');

      expect(avatar.storedName).toBe('real.webp');
      expect(avatar.mimeType).toBe('image/webp');
    });
  });
});
