import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';
import { NotificationPreferencesDto } from './dto/notification-preferences.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  AVATARS_DIR,
  avatarStorage,
  avatarFileFilter,
  MAX_AVATAR_SIZE_BYTES,
  AVATAR_FILE_NAME_PATTERN,
} from './avatar.storage';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Get()
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser() caller: JwtUserPayload) {
    const { user, welcomeEmail } = await this.usersService.create(dto, caller.sub);
    // welcomeEmail tells the form whether the sign-in email reached the new user.
    return { ...user, welcomeEmail };
  }

  // Everyone — upload / replace your own profile picture (JPG, PNG or WEBP, up to 2MB).
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: avatarStorage,
      fileFilter: avatarFileFilter,
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    if (!file) throw new BadRequestException('Choose an image to upload');
    return this.usersService.setAvatar(caller.sub, file.filename);
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  async removeAvatar(@CurrentUser() caller: JwtUserPayload) {
    return this.usersService.removeAvatar(caller.sub);
  }

  // HR / ADMIN / CEO — "notify me about every new request" switch on the Notifications page.
  @Roles(RoleName.HR, RoleName.ADMIN, RoleName.CEO)
  @Patch('me/notification-preferences')
  async updateNotificationPreferences(
    @Body() dto: NotificationPreferencesDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.usersService.setNotifyAllRequests(caller.sub, dto.notifyAllRequests);
  }

  // Public so <img src> works without the Bearer token — file names are random UUIDs (unguessable)
  // and must match the storage's own pattern, so nothing else on disk can be reached. Declared
  // before ':id' so 'avatars' isn't parsed as an id.
  @Public()
  @Get('avatars/:file')
  serveAvatar(@Param('file') file: string, @Res() res: Response) {
    const path = join(AVATARS_DIR, file);
    if (!AVATAR_FILE_NAME_PATTERN.test(file) || !existsSync(path)) {
      throw new NotFoundException('Profile picture not found');
    }
    res.set({
      // helmet defaults this to same-origin, which would block the frontend (another origin).
      'Cross-Origin-Resource-Policy': 'cross-origin',
      // Each upload gets a new file name, so the image at a given URL never changes.
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.sendFile(path);
  }

  // Allowed for HR/ADMIN, or the user themself ("self"), or their direct manager ("manager-of").
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    await this.usersService.assertCanView(caller, id);
    // Salary fields are only included for HR / ADMIN (decided in the service from the role).
    return this.usersService.findOne(id, caller.role);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.usersService.update(id, dto, caller.sub, caller.role);
  }

  @Roles(RoleName.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.softDelete(id);
    return { deleted: true };
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.usersService.resetPassword(id, caller.sub);
  }

  // HR/ADMIN, or self (only meaningful if the caller is that user's manager).
  @Get(':id/reports')
  async reports(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    this.usersService.assertCanViewReports(caller, id);
    return this.usersService.findReports(id);
  }

  // HR, ADMIN, self, manager-of — same ownership pattern as assertCanView. Gap-fix Gap 1.
  @Get(':id/profile')
  async getProfile(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    await this.usersService.assertCanView(caller, id);
    return this.usersService.getProfile(id);
  }

  // HR, ADMIN, or self only (no manager-of) — an employee can fill in their own profile, HR/Admin
  // can edit anyone's. Upserts on first write. Gap-fix Gap 1.
  @Patch(':id/profile')
  async updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeProfileDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    this.usersService.assertCanEditProfile(caller, id);
    return this.usersService.upsertProfile(id, dto);
  }
}
