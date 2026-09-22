import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Marks a route as requiring one of the given roles. Used together with RolesGuard.
 * Example: @Roles(RoleName.HR, RoleName.ADMIN)
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
