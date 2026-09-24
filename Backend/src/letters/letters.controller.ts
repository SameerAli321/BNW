import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { existsSync, createReadStream } from 'fs';
import { Request, Response } from 'express';
import { LettersService } from './letters.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CreateLetterDto } from './dto/create-letter.dto';
import { UpdateLetterDto } from './dto/update-letter.dto';
import { QueryLettersDto } from './dto/query-letters.dto';
import { RequestChangesDto } from './dto/request-changes.dto';
import { SignLetterDto } from './dto/sign-letter.dto';

function requestMeta(req: Request): { ipAddress: string | null; userAgent: string | null } {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}

@Controller('letters')
export class LettersController {
  constructor(private readonly lettersService: LettersService) {}

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post()
  async create(@Body() dto: CreateLetterDto, @CurrentUser() caller: JwtUserPayload) {
    return this.lettersService.createLetter(dto, caller.sub);
  }

  // HR, CEO, ADMIN see everything (subject to filters); any other authenticated caller only ever
  // sees letters where they're the subject — enforced server-side in the service, no @Roles gate.
  @Get()
  async findAll(@Query() query: QueryLettersDto, @CurrentUser() caller: JwtUserPayload) {
    return this.lettersService.listLetters(query, caller);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.lettersService.getLetter(id, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLetterDto) {
    return this.lettersService.updateLetter(id, dto);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/preview')
  async preview(@Param('id', ParseIntPipe) id: number) {
    const data = await this.lettersService.preview(id);
    return { data };
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/submit-to-ceo')
  async submitToCeo(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.lettersService.submitToCeo(id, caller);
  }

  @Roles(RoleName.CEO)
  @Post(':id/request-changes')
  async requestChanges(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RequestChangesDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.lettersService.requestChanges(id, dto.comment, caller);
  }

  @Roles(RoleName.CEO)
  @Post(':id/ceo-sign')
  async ceoSign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SignLetterDto,
    @CurrentUser() caller: JwtUserPayload,
    @Req() req: Request,
  ) {
    return this.lettersService.ceoSign(id, dto.signatureText, caller, requestMeta(req));
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/send-to-employee')
  async sendToEmployee(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.lettersService.sendToEmployee(id, caller);
  }

  // Self only (subjectUserId === caller.id) — enforced in the service, no @Roles gate (any role
  // can be the subject of a letter).
  @Post(':id/employee-sign')
  async employeeSign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SignLetterDto,
    @CurrentUser() caller: JwtUserPayload,
    @Req() req: Request,
  ) {
    return this.lettersService.employeeSign(id, dto.signatureText, caller, requestMeta(req));
  }

  @Get(':id/pdf')
  async downloadPdf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
    @Res() res: Response,
  ) {
    const { absolutePath, letter } = await this.lettersService.getPdfForDownload(id, caller);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Rendered PDF not found on disk');
    }
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="letter-${letter.id}.pdf"`,
    });
    createReadStream(absolutePath).pipe(res);
  }
}
