import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import {
  CreateWorkOrderDto,
  ProcessWorkOrderDto,
  QueryWorkOrdersDto,
  UpdateWorkOrderSettingsDto,
  WorkOrderDecisionDto,
} from './dto/work-order.dto';
import { MAX_RECEIPT_SIZE_BYTES, receiptFileFilter, receiptStorage } from './receipt.storage';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersPdfService } from './work-orders-pdf.service';

@Controller('work-orders')
export class WorkOrdersController {
  constructor(
    private readonly service: WorkOrdersService,
    private readonly pdfService: WorkOrdersPdfService,
  ) {}

  // Everyone — the create form shows the categories and the CEO limit.
  @Get('settings')
  async settings() {
    return this.service.getSettings();
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Put('settings')
  async updateSettings(@Body() dto: UpdateWorkOrderSettingsDto) {
    return this.service.updateSettings(dto.ceoApprovalLimit);
  }

  // Anyone, for themselves. multipart/form-data with an optional `receipt` file.
  @Post()
  @UseInterceptors(
    FileInterceptor('receipt', {
      storage: receiptStorage,
      fileFilter: receiptFileFilter,
      limits: { fileSize: MAX_RECEIPT_SIZE_BYTES },
    }),
  )
  async create(
    @Body() dto: CreateWorkOrderDto,
    @UploadedFile() receipt: Express.Multer.File | undefined,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.create(dto, receipt, caller);
  }

  @Get('mine')
  async mine(@Query() query: QueryWorkOrdersDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.list(query, { kind: 'mine', userId: caller.sub });
  }

  // Requests from the caller's direct reports.
  @Get('team')
  async team(@Query() query: QueryWorkOrdersDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.list(query, { kind: 'team', userId: caller.sub });
  }

  // Everything currently waiting on the caller (manager / CEO / Payroll / HR step).
  @Get('queue')
  async queue(@Query() query: QueryWorkOrdersDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.list(query, { kind: 'queue', caller });
  }

  // Payroll only sees reimbursements (filtered in the service).
  @Roles(RoleName.HR, RoleName.ADMIN, RoleName.CEO, RoleName.PAYROLL)
  @Get()
  async findAll(@Query() query: QueryWorkOrdersDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.list(query, { kind: 'all', caller });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.service.getOne(id, caller);
  }

  @Get(':id/pdf')
  async pdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
    @Res() res: Response,
  ) {
    const row = await this.service.findEntityForViewer(id, caller);
    const bytes = await this.pdfService.render(row);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="work-order-${row.id}.pdf"`,
    });
    res.send(Buffer.from(bytes));
  }

  @Get(':id/receipt')
  async receipt(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
    @Res() res: Response,
  ) {
    const { row, absolutePath } = await this.service.getReceipt(id, caller);
    res.set({
      'Content-Type': row.receiptMime ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(row.receiptOriginalName ?? 'receipt')}"`,
    });
    res.sendFile(absolutePath);
  }

  @Post(':id/manager-decision')
  @HttpCode(HttpStatus.OK)
  async managerDecision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkOrderDecisionDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.managerDecision(id, dto, caller);
  }

  @Roles(RoleName.CEO)
  @Post(':id/ceo-decision')
  @HttpCode(HttpStatus.OK)
  async ceoDecision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: WorkOrderDecisionDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.ceoDecision(id, dto, caller);
  }

  @Roles(RoleName.PAYROLL, RoleName.HR, RoleName.ADMIN)
  @Post(':id/process')
  @HttpCode(HttpStatus.OK)
  async process(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessWorkOrderDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.process(id, dto, caller);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.service.cancel(id, caller);
  }
}
