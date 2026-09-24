import { Controller, Get } from '@nestjs/common';
import { EmployeesService } from './employees.service';

@Controller('document-types')
export class DocumentTypesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // Any authenticated user (no @Roles() => guard allows all).
  @Get()
  async findAll() {
    return this.employeesService.listDocumentTypes();
  }
}
