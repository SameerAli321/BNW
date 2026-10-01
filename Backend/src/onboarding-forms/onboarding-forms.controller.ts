import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { OnboardingFormsService } from './onboarding-forms.service';
import { OnboardingFormPdfService } from './onboarding-form-pdf.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { SubmitOnboardingFormDto } from './dto/submit-onboarding-form.dto';
import { HrRecordDto } from './dto/hr-record.dto';
import { QueryOnboardingFormsDto } from './dto/query-onboarding-forms.dto';

@Controller('onboarding-forms')
export class OnboardingFormsController {
  constructor(
    private readonly service: OnboardingFormsService,
    private readonly pdfService: OnboardingFormPdfService,
  ) {}

  // Every user fills in their own — no @Roles gate.
  @Get('mine')
  async mine(@CurrentUser() caller: JwtUserPayload) {
    return this.service.getMine(caller);
  }

  @Put('mine')
  async submitMine(@Body() dto: SubmitOnboardingFormDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.submitMine(dto, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN, RoleName.CEO)
  @Get()
  async findAll(@Query() query: QueryOnboardingFormsDto) {
    return this.service.listAll(query);
  }

  // Owner or HR / ADMIN / CEO — enforced in the service.
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.service.getOne(id, caller);
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
    @Res() res: Response,
  ) {
    const form = await this.service.findEntityForViewer(id, caller);
    const bytes = await this.pdfService.render(form);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="onboarding-form-${form.id}.pdf"`,
    });
    res.send(Buffer.from(bytes));
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/hr-record')
  async hrRecord(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HrRecordDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.hrRecord(id, dto, caller);
  }
}
