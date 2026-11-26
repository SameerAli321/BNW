import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName, TEAM_LEAD_ROLES } from '../common/enums/role.enum';
import { avatarFileFilter, avatarStorage, MAX_AVATAR_SIZE_BYTES } from '../users/avatar.storage';
import { AboutService } from './about.service';
import { UpdateAboutDto } from './about.dto';
import { PolicyService } from './policy.service';
import { AcknowledgePolicyDto, RemindPolicyDto } from './policy.dto';

/**
 * About us — everyone reads it; the CEO, HR and Admin edit it. The CEO photo is stored with the
 * profile pictures and served by the same public image route (GET /users/avatars/:file). Everyone,
 * Hayes staff included, gets the BNW edition.
 */
@Controller('about')
export class AboutController {
  constructor(
    private readonly service: AboutService,
    private readonly policy: PolicyService,
  ) {}

  @Get()
  get() {
    return this.service.get(this.service.editionFor());
  }

  @Roles(RoleName.CEO, RoleName.HR, RoleName.ADMIN)
  @Put()
  async update(@Body() dto: UpdateAboutDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.update(this.service.editionFor(), dto, caller.sub);
  }

  // JPG, PNG or WEBP, up to 5MB.
  @Roles(RoleName.CEO, RoleName.HR, RoleName.ADMIN)
  @Post('ceo-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: avatarStorage,
      fileFilter: avatarFileFilter,
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
    }),
  )
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    if (!file) throw new BadRequestException('Choose an image to upload');
    const edition = this.service.editionFor();
    return this.service.setPhoto(edition, file.filename, caller.sub);
  }

  // --- Employee Policy Handbook acknowledgements ---------------------------------------------

  @Get('policy/acknowledgement/mine')
  async myAcknowledgement(@CurrentUser() caller: JwtUserPayload) {
    return { data: await this.policy.mine(caller) };
  }

  // Everyone signs for themselves; it's sent to their manager and HR.
  @Post('policy/acknowledge')
  async acknowledge(
    @Body() dto: AcknowledgePolicyDto,
    @CurrentUser() caller: JwtUserPayload,
    @Req() req: Request,
  ) {
    const data = await this.policy.acknowledge(caller, dto.signatureText, {
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
    });
    return { data };
  }

  // CEO / HR / Admin: everyone; Team Leads: their direct reports.
  @Roles(RoleName.CEO, RoleName.HR, RoleName.ADMIN, ...TEAM_LEAD_ROLES)
  @Get('policy/acknowledgements')
  async acknowledgements(@CurrentUser() caller: JwtUserPayload) {
    return this.policy.list(caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post('policy/remind')
  @HttpCode(HttpStatus.OK)
  async remind(@Body() dto: RemindPolicyDto, @CurrentUser() caller: JwtUserPayload) {
    return { data: await this.policy.remind(caller, dto.userIds) };
  }

  @Roles(RoleName.CEO, RoleName.HR, RoleName.ADMIN)
  @Delete('ceo-photo')
  @HttpCode(HttpStatus.OK)
  async removePhoto(@CurrentUser() caller: JwtUserPayload) {
    const edition = this.service.editionFor();
    return this.service.removePhoto(edition, caller.sub);
  }
}
