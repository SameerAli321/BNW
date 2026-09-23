import { Controller, Get, NotFoundException, Param, ParseIntPipe, Res } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { Response } from 'express';
import { EmployeesService } from './employees.service';
import { UsersService } from '../users/users.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly usersService: UsersService,
  ) {}

  // HR, ADMIN, CEO, self (if the document belongs to them), manager-of — same ownership rule as
  // GET /employees/:id/record, checked against the document's owning employee.
  @Get(':id/download')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
    @Res() res: Response,
  ) {
    const { document, absolutePath } = await this.employeesService.getDocumentForDownload(id);
    await this.usersService.assertCanViewRecord(caller, document.userId);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Document not found');
    }

    res.set({
      'Content-Type': document.mime,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(document.originalName)}"`,
    });
    createReadStream(absolutePath).pipe(res);
  }
}
