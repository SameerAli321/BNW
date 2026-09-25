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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { createReadStream, existsSync } from 'fs';
import { Request, Response } from 'express';
import { CandidatesService } from './candidates.service';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { QueryCandidatesDto } from './dto/query-candidates.dto';
import { ConvertCandidateDto } from './dto/convert-candidate.dto';
import {
  candidateCvFileFilter,
  candidateCvStorage,
  MAX_DOCUMENT_SIZE_BYTES,
} from './candidate-cv.storage';

@Roles(RoleName.HR, RoleName.ADMIN)
@Controller('candidates')
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post('bulk-upload')
  @UseInterceptors(
    FilesInterceptor('files', 50, {
      storage: candidateCvStorage,
      fileFilter: candidateCvFileFilter,
      limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
    }),
  )
  async bulkUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() caller: JwtUserPayload,
  ) {
    const data = await this.candidatesService.bulkUpload(files, caller.sub);
    return { data };
  }

  @Get()
  async findAll(@Query() query: QueryCandidatesDto) {
    return this.candidatesService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.candidatesService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCandidateDto) {
    return this.candidatesService.update(id, dto);
  }

  @Get(':id/cv')
  async downloadCv(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { candidate, absolutePath } = await this.candidatesService.getCvForDownload(id);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('CV file not found');
    }

    this.auditLogService.log({
      actorId: caller.sub,
      action: 'CANDIDATE_CV_DOWNLOAD',
      entity: 'Candidate',
      entityId: candidate.id,
      ipAddress: req.ip ?? null,
    });

    res.set({
      'Content-Type': candidate.cvMime,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(candidate.cvOriginalName)}"`,
    });
    createReadStream(absolutePath).pipe(res);
  }

  @Post(':id/convert')
  async convert(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConvertCandidateDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.candidatesService.convert(id, dto, caller.sub);
  }
}
