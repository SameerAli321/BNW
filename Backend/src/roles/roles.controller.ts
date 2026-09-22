import { Controller, Get } from '@nestjs/common';
import { ALL_ROLES } from '../common/enums/role.enum';

@Controller('roles')
export class RolesController {
  // Any authenticated user may read the static role list (no @Roles() => guard allows all).
  @Get()
  findAll() {
    return ALL_ROLES.map((name) => ({ name }));
  }
}
