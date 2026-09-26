import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../decorators/current-user.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { UserRole } from '../../users/schemas/user.schema.js';

/**
 * Regla de "dueño o rol": pensado para rutas `/algo/:id`. Si el `:id` de la
 * ruta coincide con el usuario autenticado, siempre se permite — cada quien
 * gestiona lo suyo sin necesitar ningún rol especial. Si no coincide (está
 * actuando sobre el recurso de otro), exige que su rol esté en `@Roles(...)`.
 *
 * Requiere correr después de `JwtAuthGuard` (necesita `request.user` ya
 * resuelto). Sin `@Roles(...)` en la ruta, no restringe nada.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser; params: Record<string, string> }>();

    if (request.params.id && request.params.id === request.user.id) {
      return true;
    }

    if (!requiredRoles.includes(request.user.role)) {
      throw new ForbiddenException('No tenés permiso para actuar sobre este recurso');
    }
    return true;
  }
}
