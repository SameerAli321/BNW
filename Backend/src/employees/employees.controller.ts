import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmployeesService } from './employees.service';
import { UsersService } from '../users/users.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';
import {
  employeeDocumentFileFilter,
  employeeDocumentStorage,
  MAX_DOCUMENT_SIZE_BYTES,
} from './employee-documents.storage';

@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly usersService: UsersService,
  ) {}

  // HR, ADMIN, CEO, self, manager-of — per API_CONTRACT_SPRINT2.md's endpoint table.
  @Get(':id/record')
  async getRecord(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    await this.usersService.assertCanViewRecord(caller, id);
    return this.employeesService.getRecord(id);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: employeeDocumentStorage,
      fileFilter: employeeDocumentFileFilter,
      limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
    }),
  )
  async uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.employeesService.uploadDocument(id, dto, file, caller.sub);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/document-requests')
  async createDocumentRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateDocumentRequestDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.employeesService.createDocumentRequest(id, dto, caller.sub);
  }
}
