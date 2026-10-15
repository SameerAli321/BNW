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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { avatarFileFilter, avatarStorage, MAX_AVATAR_SIZE_BYTES } from '../users/avatar.storage';
import { AboutService } from './about.service';
import { UpdateAboutDto } from './about.dto';

/**
 * About us — everyone reads it; the CEO, HR and Admin edit it. The CEO photo is stored with the
 * profile pictures and served by the same public image route (GET /users/avatars/:file).
 */
@Controller('about')
export class AboutController {
  constructor(private readonly service: AboutService) {}

  @Get()
  async get() {
    return this.service.get();
  }

  @Roles(RoleName.CEO, RoleName.HR, RoleName.ADMIN)
  @Put()
  async update(@Body() dto: UpdateAboutDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.update(dto, caller.sub);
  }

  // JPG, PNG or WEBP, up to 2MB.
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
    return this.service.setPhoto(file.filename, caller.sub);
  }

  @Roles(RoleName.CEO, RoleName.HR, RoleName.ADMIN)
  @Delete('ceo-photo')
  @HttpCode(HttpStatus.OK)
  async removePhoto(@CurrentUser() caller: JwtUserPayload) {
    return this.service.removePhoto(caller.sub);
  }
}
