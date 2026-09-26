import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../users/schemas/user.schema.js';

export const ROLES_KEY = 'roles';

/** Marca qué rol necesita un usuario para actuar sobre el recurso de **otro** — ver RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
