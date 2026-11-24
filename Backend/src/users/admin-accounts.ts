import { ForbiddenException } from '@nestjs/common';
import { RoleName } from '../common/enums/role.enum';

/**
 * Super Admin (ADMIN) accounts are Admin's alone (client decision, Nov 2026): HR creates and edits
 * every other user, but can't make anyone Admin or change / reset an existing Admin's account.
 */
export function assertMayAssignRole(callerRole: string, role: string | undefined): void {
  if (role === RoleName.ADMIN && callerRole !== RoleName.ADMIN) {
    throw new ForbiddenException('Only a Super Admin can give someone the Admin role');
  }
}

export function assertMayManageAccount(callerRole: string, targetRole: string): void {
  if (targetRole === RoleName.ADMIN && callerRole !== RoleName.ADMIN) {
    throw new ForbiddenException('Only a Super Admin can change a Super Admin account');
  }
}
