import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserRole } from '../../users/schemas/user.schema.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/** Extrae el usuario adjuntado por JwtStrategy (req.user) en un handler protegido por JwtAuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
