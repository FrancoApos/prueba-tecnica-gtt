import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import type { AuthenticatedUser } from '../decorators/current-user.decorator.js';

describe('RolesGuard', () => {
  function buildContext(user: AuthenticatedUser, params: Record<string, string>): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  function buildGuard(requiredRoles: string[] | undefined) {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(requiredRoles) } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  it('allows the request through untouched when the route has no @Roles()', () => {
    const guard = buildGuard(undefined);
    const context = buildContext({ id: 'user-1', email: 'a@a.com', role: 'user' }, { id: 'user-2' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('always allows a user to act on their own resource, regardless of role', () => {
    const guard = buildGuard(['admin']);
    const context = buildContext({ id: 'user-1', email: 'a@a.com', role: 'user' }, { id: 'user-1' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a non-admin acting on someone else\'s resource', () => {
    const guard = buildGuard(['admin']);
    const context = buildContext({ id: 'user-1', email: 'a@a.com', role: 'user' }, { id: 'user-2' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows an admin to act on someone else\'s resource', () => {
    const guard = buildGuard(['admin']);
    const context = buildContext({ id: 'admin-1', email: 'admin@a.com', role: 'admin' }, { id: 'user-2' });

    expect(guard.canActivate(context)).toBe(true);
  });
});
