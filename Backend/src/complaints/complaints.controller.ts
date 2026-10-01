import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ComplaintsService } from './complaints.service';
import { ComplaintPdfService } from './complaint-pdf.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { HrResponseDto } from './dto/hr-response.dto';
import { QueryComplaintsDto } from './dto/query-complaints.dto';

@Controller('complaints')
export class ComplaintsController {
  constructor(
    private readonly complaintsService: ComplaintsService,
    private readonly complaintPdfService: ComplaintPdfService,
  ) {}

  // Anyone can submit a complaint to HR — no @Roles gate; the complainant is always the caller.
  @Post()
  async create(@Body() dto: CreateComplaintDto, @CurrentUser() caller: JwtUserPayload) {
    return this.complaintsService.create(dto, caller);
  }

  @Get('mine')
  async mine(@Query() query: QueryComplaintsDto, @CurrentUser() caller: JwtUserPayload) {
    return this.complaintsService.mine(query, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN, RoleName.CEO)
  @Get()
  async findAll(@Query() query: QueryComplaintsDto) {
    return this.complaintsService.listAll(query);
  }

  // Complainant or HR/ADMIN/CEO — enforced in the service.
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.complaintsService.getOne(id, caller);
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
    @Res() res: Response,
  ) {
    const complaint = await this.complaintsService.findEntityForViewer(id, caller);
    const bytes = await this.complaintPdfService.render(complaint);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="complaint-${complaint.id}.pdf"`,
    });
    res.send(Buffer.from(bytes));
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Patch(':id/hr-response')
  async hrResponse(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HrResponseDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.complaintsService.hrResponse(id, dto, caller);
  }
}
