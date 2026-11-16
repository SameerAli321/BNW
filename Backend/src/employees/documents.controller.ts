import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Req,
  Res,
} from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { Request, Response } from 'express';
import { EmployeesService } from './employees.service';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';

@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // HR, ADMIN, CEO, self (if the document belongs to them), manager-of — same ownership rule as
  // GET /employees/:id/record, checked against the document's owning employee.
  @Get(':id/download')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { document, absolutePath } = await this.employeesService.getDocumentForDownload(id);
    await this.usersService.assertCanViewRecord(caller, document.userId);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Document not found');
    }

    // Gap-fix Gap 2: audit every document download, per docs/API_CONTRACT_GAPS_FIX.md.
    this.auditLogService.log({
      actorId: caller.sub,
      action: 'DOCUMENT_DOWNLOAD',
      entity: 'EmployeeDocument',
      entityId: document.id,
      ipAddress: req.ip ?? null,
    });

    res.set({
      'Content-Type': document.mime,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(document.originalName)}"`,
    });
    createReadStream(absolutePath).pipe(res);
  }

  // HR / ADMIN — remove a document uploaded by mistake (record + file). Audited with its details.
  @Roles(RoleName.HR, RoleName.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
    @Req() req: Request,
  ) {
    const document = await this.employeesService.deleteDocument(id);
    this.auditLogService.log({
      actorId: caller.sub,
      action: 'DOCUMENT_DELETE',
      entity: 'EmployeeDocument',
      entityId: document.id,
      before: {
        userId: document.userId,
        documentTypeId: document.documentTypeId,
        originalName: document.originalName,
        source: document.source,
        uploadedBy: document.uploadedBy,
      },
      ipAddress: req.ip ?? null,
    });
  }
}
