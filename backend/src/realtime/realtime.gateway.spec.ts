import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PresenceService } from './presence.service.js';
import { RealtimeGateway } from './realtime.gateway.js';

/**
 * Socket mínimo con lo que usa el gateway. `data` arranca vacío porque es
 * donde el propio gateway guarda el userId al autenticar.
 */
function fakeSocket(id: string, token: string | null = 'token-valido') {
  return {
    id,
    data: {} as { userId?: string },
    handshake: { auth: token ? { token } : {}, headers: {} },
    join: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
}

describe('RealtimeGateway (presencia)', () => {
  const ANA = 'user-ana';
  const BRUNO = 'user-bruno';

  let gateway: RealtimeGateway;
  let presenceService: {
    setStatus: ReturnType<typeof vi.fn>;
    getPresence: ReturnType<typeof vi.fn>;
    contactIdsOf: ReturnType<typeof vi.fn>;
  };
  let emit: ReturnType<typeof vi.fn>;
  let to: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    presenceService = {
      setStatus: vi.fn().mockResolvedValue({ userId: ANA, status: 'online', lastSeenAt: new Date() }),
      getPresence: vi.fn().mockResolvedValue({ userId: ANA, status: 'online', lastSeenAt: new Date() }),
      contactIdsOf: vi.fn().mockResolvedValue([BRUNO]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RealtimeGateway,
        { provide: JwtService, useValue: { verifyAsync: vi.fn().mockResolvedValue({ sub: ANA, email: 'ana@example.com' }) } },
        { provide: PresenceService, useValue: presenceService },
      ],
    }).compile();

    gateway = moduleRef.get(RealtimeGateway);

    // El server lo inyecta socket.io en runtime (@WebSocketServer), no el DI.
    emit = vi.fn();
    to = vi.fn().mockReturnValue({ emit });
    Object.assign(gateway, { server: { to } });
  });

  it('marks the user online on their first socket and notifies their contacts', async () => {
    await gateway.handleConnection(fakeSocket('socket-1') as never);

    expect(presenceService.setStatus).toHaveBeenCalledWith(ANA, 'online');
    expect(to).toHaveBeenCalledWith(`user:${BRUNO}`);
    expect(emit).toHaveBeenCalledWith('presence:changed', expect.objectContaining({ userId: ANA, status: 'online' }));
  });

  it('does not re-announce presence when the same user opens a second session', async () => {
    await gateway.handleConnection(fakeSocket('socket-1') as never);
    presenceService.setStatus.mockClear();

    await gateway.handleConnection(fakeSocket('socket-2') as never);

    expect(presenceService.setStatus).not.toHaveBeenCalled();
  });

  it('keeps the user online while another session is still open', async () => {
    const phone = fakeSocket('socket-phone');
    const web = fakeSocket('socket-web');
    await gateway.handleConnection(phone as never);
    await gateway.handleConnection(web as never);
    presenceService.setStatus.mockClear();

    await gateway.handleDisconnect(phone as never);

    expect(presenceService.setStatus).not.toHaveBeenCalled();
  });

  it('marks the user offline when their last session closes', async () => {
    const phone = fakeSocket('socket-phone');
    const web = fakeSocket('socket-web');
    await gateway.handleConnection(phone as never);
    await gateway.handleConnection(web as never);
    presenceService.setStatus.mockClear();

    await gateway.handleDisconnect(phone as never);
    await gateway.handleDisconnect(web as never);

    expect(presenceService.setStatus).toHaveBeenCalledExactlyOnceWith(ANA, 'offline');
  });

  it('rejects a socket without a token and never touches presence', async () => {
    const anonymous = fakeSocket('socket-anon', null);

    await gateway.handleConnection(anonymous as never);

    expect(anonymous.emit).toHaveBeenCalledWith('auth:error', expect.anything());
    expect(anonymous.disconnect).toHaveBeenCalledWith(true);
    expect(presenceService.setStatus).not.toHaveBeenCalled();
  });
});
