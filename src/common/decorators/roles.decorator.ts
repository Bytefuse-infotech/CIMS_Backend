import { SetMetadata } from '@nestjs/common';
import { SuperRole, UserRole } from '@shared/enums';

export const ROLES_KEY = 'roles';
/** Restrict a tenant-surface route to specific institute roles. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const SUPER_ROLES_KEY = 'superRoles';
/** Restrict a platform-surface route to specific super roles. */
export const SuperRoles = (...roles: SuperRole[]) => SetMetadata(SUPER_ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';
/** Marks a route as not requiring authentication (e.g. login, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
