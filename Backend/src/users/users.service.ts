import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { User } from '../entities/user.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { UserStatus } from '../common/enums/user-status.enum';
import { RoleName } from '../common/enums/role.enum';
import { COMPENSATION_VIEWER_ROLES, toUserDto, UserDto } from '../common/mappers/user.mapper';
import {
  EmployeeProfileDto,
  toEmployeeProfileDto,
} from '../common/mappers/employee-profile.mapper';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateEmployeeProfileDto } from './dto/update-employee-profile.dto';
import { generateTempPassword } from '../common/utils/temp-password';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AVATARS_DIR } from './avatar.storage';
import { MailService } from '../mail/mail.service';
import { renderWelcomeEmail } from './welcome-email';

/** Result of the welcome email sent when an account is created. */
export type WelcomeEmailResult = {
  status: 'SENT' | 'FAILED' | 'NOT_CONFIGURED';
  sentTo: string;
  error?: string;
};

/** Today as YYYY-MM-DD (server local time). */
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(EmployeeProfile)
    private readonly employeeProfilesRepo: Repository<EmployeeProfile>,
    private readonly auditLogService: AuditLogService,
    private readonly mail: MailService,
  ) {}

  async findAll(
    query: QueryUsersDto,
  ): Promise<{ data: UserDto[]; meta: { total: number; page: number; limit: number } }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    const qb = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.manager', 'manager')
      .leftJoinAndSelect('user.department', 'department');

    if (query.q) {
      qb.andWhere(
        '(user.firstName ILIKE :q OR user.lastName ILIKE :q OR user.email ILIKE :q OR user.employeeCode ILIKE :q)',
        { q: `%${query.q}%` },
      );
    }
    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }
    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }
    if (query.departmentId) {
      qb.andWhere('user.departmentId = :departmentId', { departmentId: query.departmentId });
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const profiles = await this.profilesFor(rows.map((row) => row.id));

    // GET /users is HR / ADMIN only, so the salary fields are always included here.
    return {
      data: rows.map((row) =>
        toUserDto(row, { profile: profiles.get(row.id) ?? null, includeCompensation: true }),
      ),
      meta: { total, page, limit },
    };
  }

  private async profilesFor(userIds: number[]): Promise<Map<number, EmployeeProfile>> {
    if (!userIds.length) return new Map();
    const profiles = await this.employeeProfilesRepo.find({ where: { userId: In(userIds) } });
    return new Map(profiles.map((profile) => [profile.userId, profile]));
  }

  /**
   * A user with their profile's contact number / CNIC, and the salary fields only when the
   * viewer is HR / ADMIN.
   */
  async toDetailedDto(user: User, viewerRole?: string): Promise<UserDto> {
    const profile = await this.employeeProfilesRepo.findOne({ where: { userId: user.id } });
    return toUserDto(user, {
      profile,
      includeCompensation: !!viewerRole && COMPENSATION_VIEWER_ROLES.includes(viewerRole),
    });
  }

  async findOneEntity(id: number): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: ['manager', 'department'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findOne(id: number, viewerRole?: string): Promise<UserDto> {
    return this.toDetailedDto(await this.findOneEntity(id), viewerRole);
  }

  /** Sets the caller's profile picture to the just-uploaded file, removing the previous one. */
  async setAvatar(userId: number, fileName: string): Promise<UserDto> {
    const user = await this.findOneEntity(userId);
    this.removeAvatarFile(user.avatarPath);
    user.avatarPath = fileName;
    await this.usersRepo.update(userId, { avatarPath: fileName });
    return toUserDto(user);
  }

  /** The caller's "notify me about every new request" switch. */
  async setNotifyAllRequests(userId: number, enabled: boolean): Promise<UserDto> {
    await this.usersRepo.update(userId, { notifyAllRequests: enabled });
    return toUserDto(await this.findOneEntity(userId));
  }

  async removeAvatar(userId: number): Promise<UserDto> {
    const user = await this.findOneEntity(userId);
    this.removeAvatarFile(user.avatarPath);
    user.avatarPath = null;
    await this.usersRepo.update(userId, { avatarPath: null });
    return toUserDto(user);
  }

  private removeAvatarFile(fileName: string | null): void {
    if (!fileName) return;
    const path = join(AVATARS_DIR, fileName);
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch {
      // A leftover file is harmless — never fail the request over it.
    }
  }

  async findReports(id: number): Promise<UserDto[]> {
    // Ensure the "manager" user itself exists first, so /users/:id/reports 404s cleanly.
    await this.findOneEntity(id);
    const reports = await this.usersRepo.find({
      where: { managerId: id },
      relations: ['manager', 'department'],
      order: { firstName: 'ASC' },
    });
    return reports.map((report) => toUserDto(report));
  }

  /**
   * Creates a user. HR/ADMIN set the exact password on the create form — required, min 8 chars
   * (enforced by CreateUserDto). No more server-generated temp password on create; `mustChangePassword`
   * still forces them to change it on first login regardless.
   */
  async create(
    dto: CreateUserDto,
    actorId?: number,
  ): Promise<{ user: UserDto; welcomeEmail: WelcomeEmailResult }> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }
    await this.assertEmployeeCodeFree(dto.employeeCode, null);
    this.assertDates(dto.joinDate ?? null, dto.leavingDate ?? null, dto.lastSalaryChangeDate);

    const password_hash = await bcrypt.hash(dto.password, 10);
    const currentSalary = dto.currentSalary ?? null;

    const user = this.usersRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      role: dto.role,
      managerId: dto.managerId ?? null,
      departmentId: dto.departmentId ?? null,
      designation: dto.designation ?? null,
      joinDate: dto.joinDate ?? null,
      leavingDate: dto.leavingDate ?? null,
      employeeCode: dto.employeeCode?.trim() || null,
      status: dto.status ?? UserStatus.ACTIVE,
      currentSalary,
      previousSalary: dto.previousSalary ?? null,
      deductionPolicy: dto.deductionPolicy?.trim() || null,
      // A starting salary with no change date counts from the joining date (or today).
      lastSalaryChangeDate:
        dto.lastSalaryChangeDate ?? (currentSalary !== null ? (dto.joinDate ?? todayIso()) : null),
      mustChangePassword: true,
      password_hash,
    });

    const saved = await this.usersRepo.save(user);
    await this.saveContactDetails(saved.id, dto);

    if (currentSalary !== null) {
      this.auditLogService.log({
        actorId: actorId ?? null,
        action: 'SALARY_SET',
        entity: 'User',
        entityId: saved.id,
        after: { currentSalary, lastSalaryChangeDate: saved.lastSalaryChangeDate },
      });
    }

    const full = await this.findOneEntity(saved.id);
    const welcomeEmail = await this.sendWelcomeEmail(full, dto.password, actorId);
    return { user: await this.toDetailedDto(full, RoleName.HR), welcomeEmail };
  }

  /**
   * Emails the new user their sign-in details at their registered address. Never throws — the
   * account exists either way; the result is shown to HR so they know whether it arrived.
   */
  private async sendWelcomeEmail(
    user: User,
    password: string,
    actorId?: number,
  ): Promise<WelcomeEmailResult> {
    const email = renderWelcomeEmail({
      firstName: user.firstName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      password,
      role: user.role,
      employeeCode: user.employeeCode,
      designation: user.designation,
      departmentName: user.department?.name ?? null,
      joinDate: user.joinDate,
      signInUrl: this.mail.appUrl('/auth/jwt/sign-in'),
    });
    const result = await this.mail.send({ to: user.email, ...email });
    const outcome: WelcomeEmailResult = {
      status: result.status,
      sentTo: user.email,
      ...(result.status === 'FAILED' ? { error: result.error } : {}),
    };
    this.auditLogService.log({
      actorId: actorId ?? null,
      action: result.status === 'SENT' ? 'WELCOME_EMAIL_SENT' : 'WELCOME_EMAIL_FAILED',
      entity: 'User',
      entityId: user.id,
      after: { to: user.email, status: result.status, error: outcome.error ?? null },
    });
    return outcome;
  }

  /** Contact number / CNIC live on employee_profiles — create the row on first write. */
  private async saveContactDetails(
    userId: number,
    dto: { contactNumber?: string | null; cnic?: string | null },
  ): Promise<void> {
    if (dto.contactNumber === undefined && dto.cnic === undefined) return;
    let profile = await this.employeeProfilesRepo.findOne({ where: { userId } });
    if (!profile) profile = this.employeeProfilesRepo.create({ userId });
    if (dto.contactNumber !== undefined) profile.phone = dto.contactNumber?.trim() || null;
    if (dto.cnic !== undefined) profile.nationalId = dto.cnic || null;
    await this.employeeProfilesRepo.save(profile);
  }

  private async assertEmployeeCodeFree(code: string | null | undefined, selfId: number | null) {
    const value = code?.trim();
    if (!value) return;
    const clash = await this.usersRepo.findOne({
      where: { employeeCode: value },
      withDeleted: true,
    });
    if (clash && clash.id !== selfId) {
      throw new ConflictException(`Employee code ${value} is already used by another employee`);
    }
  }

  private assertDates(
    joinDate: string | null,
    leavingDate: string | null,
    lastSalaryChangeDate: string | null | undefined,
  ): void {
    if (joinDate && leavingDate && leavingDate.slice(0, 10) < joinDate.slice(0, 10)) {
      throw new BadRequestException('Leaving date cannot be before the date of joining');
    }
    if (lastSalaryChangeDate && lastSalaryChangeDate.slice(0, 10) > todayIso()) {
      throw new BadRequestException('Last salary change date cannot be in the future');
    }
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    actorId?: number,
    viewerRole: string = RoleName.HR,
  ): Promise<UserDto> {
    const user = await this.findOneEntity(id);
    if (dto.employeeCode !== undefined) await this.assertEmployeeCodeFree(dto.employeeCode, id);
    this.assertDates(
      dto.joinDate !== undefined ? dto.joinDate : user.joinDate,
      dto.leavingDate !== undefined ? dto.leavingDate : user.leavingDate,
      dto.lastSalaryChangeDate,
    );

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('A user with this email already exists');
      }
      user.email = dto.email;
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.managerId !== undefined) user.managerId = dto.managerId;
    if (dto.departmentId !== undefined) user.departmentId = dto.departmentId;
    if (dto.designation !== undefined) user.designation = dto.designation;
    if (dto.joinDate !== undefined) user.joinDate = dto.joinDate;
    if (dto.employeeCode !== undefined) user.employeeCode = dto.employeeCode?.trim() || null;
    if (dto.status !== undefined) user.status = dto.status;
    if (dto.leavingDate !== undefined) user.leavingDate = dto.leavingDate;
    if (dto.deductionPolicy !== undefined) {
      user.deductionPolicy = dto.deductionPolicy?.trim() || null;
    }

    // Salary history: a new current salary moves the old one into "previous salary" and stamps
    // today as the change date — unless HR filled those in themselves.
    const before = {
      currentSalary: user.currentSalary,
      previousSalary: user.previousSalary,
      lastSalaryChangeDate: user.lastSalaryChangeDate,
    };
    const salaryChanged =
      dto.currentSalary !== undefined && dto.currentSalary !== user.currentSalary;
    const previousEdited =
      dto.previousSalary !== undefined && dto.previousSalary !== user.previousSalary;
    const dateEdited =
      dto.lastSalaryChangeDate !== undefined &&
      dto.lastSalaryChangeDate !== user.lastSalaryChangeDate;
    if (salaryChanged) {
      if (!previousEdited && user.currentSalary !== null) user.previousSalary = user.currentSalary;
      if (!dateEdited) user.lastSalaryChangeDate = todayIso();
      user.currentSalary = dto.currentSalary ?? null;
    }
    if (previousEdited) user.previousSalary = dto.previousSalary ?? null;
    if (dateEdited) user.lastSalaryChangeDate = dto.lastSalaryChangeDate ?? null;

    let passwordChanged = false;
    if (dto.password) {
      user.password_hash = await bcrypt.hash(dto.password, 10);
      user.mustChangePassword = true;
      passwordChanged = true;
    }

    // Leave out the loaded manager/department objects so they can't override the new ids.
    await this.usersRepo.save({ ...user, manager: undefined, department: undefined });
    await this.saveContactDetails(id, dto);

    if (passwordChanged) {
      this.auditLogService.log({
        actorId: actorId ?? null,
        action: 'PASSWORD_CHANGED',
        entity: 'User',
        entityId: user.id,
      });
    }
    if (
      before.currentSalary !== user.currentSalary ||
      before.previousSalary !== user.previousSalary ||
      before.lastSalaryChangeDate !== user.lastSalaryChangeDate
    ) {
      this.auditLogService.log({
        actorId: actorId ?? null,
        action: 'SALARY_CHANGED',
        entity: 'User',
        entityId: user.id,
        before,
        after: {
          currentSalary: user.currentSalary,
          previousSalary: user.previousSalary,
          lastSalaryChangeDate: user.lastSalaryChangeDate,
        },
      });
    }

    return this.findOne(id, viewerRole);
  }

  async softDelete(id: number): Promise<void> {
    const user = await this.findOneEntity(id);
    user.status = UserStatus.INACTIVE;
    await this.usersRepo.save(user);
    await this.usersRepo.softDelete(id);
  }

  /**
   * HR/ADMIN action: force-generates a brand new temp password for a user (e.g. they're locked
   * out, or HR wants to hand them fresh credentials). Same stub-email-to-console approach as
   * `create` — real SMTP delivery is a later sprint. Sets `mustChangePassword` so the user is
   * prompted to pick their own password on next login.
   */
  async resetPassword(id: number, actorId: number): Promise<{ tempPassword: string }> {
    const user = await this.findOneEntity(id);

    const tempPassword = generateTempPassword();
    user.password_hash = await bcrypt.hash(tempPassword, 10);
    user.mustChangePassword = true;
    await this.usersRepo.save(user);

    // STUB: replace with a real mail service call (SMTP) in a later sprint.
    // eslint-disable-next-line no-console
    console.log(
      `[stub email] "Your password was reset" -> ${user.email} | temp password: ${tempPassword}`,
    );

    this.auditLogService.log({
      actorId,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: user.id,
    });

    return { tempPassword };
  }

  /**
   * Shared "self, or manager-of" check: true if the caller is the target user themself, or is
   * the target user's direct manager. Does not consider role — callers decide which roles bypass
   * this entirely (see assertCanView / assertCanViewRecord).
   */
  private async isSelfOrManagerOf(caller: JwtUserPayload, targetUserId: number): Promise<boolean> {
    if (caller.sub === targetUserId) {
      return true;
    }
    const target = await this.usersRepo.findOne({ where: { id: targetUserId } });
    return !!target && target.managerId === caller.sub;
  }

  /**
   * Ownership check for GET /users/:id and /users/:id/reports when the caller is not HR/ADMIN:
   * allowed if the caller is viewing themself ("self"), or is the direct manager of the target
   * user / of the reports being listed ("manager-of").
   */
  async assertCanView(caller: JwtUserPayload, targetUserId: number): Promise<void> {
    if (caller.role === RoleName.HR || caller.role === RoleName.ADMIN) {
      return;
    }
    if (await this.isSelfOrManagerOf(caller, targetUserId)) {
      return;
    }
    throw new ForbiddenException('You do not have access to this resource');
  }

  /**
   * Ownership check for the Sprint 2 E-record endpoints (GET /employees/:id/record and
   * GET /documents/:id/download, per API_CONTRACT_SPRINT2.md): HR/ADMIN/CEO always allowed,
   * otherwise "self" or "manager-of" as in assertCanView. Kept separate from assertCanView
   * because CEO is allowed here but not on the plain Users CRUD endpoints.
   */
  async assertCanViewRecord(caller: JwtUserPayload, targetUserId: number): Promise<void> {
    if (
      caller.role === RoleName.HR ||
      caller.role === RoleName.ADMIN ||
      caller.role === RoleName.CEO
    ) {
      return;
    }
    if (await this.isSelfOrManagerOf(caller, targetUserId)) {
      return;
    }
    throw new ForbiddenException('You do not have access to this resource');
  }

  /**
   * Ownership check for GET /users/:id/reports specifically: HR/ADMIN always allowed; otherwise
   * only the manager themself may list their own direct reports ("self, if manager").
   */
  assertCanViewReports(caller: JwtUserPayload, targetUserId: number): void {
    if (caller.role === RoleName.HR || caller.role === RoleName.ADMIN) {
      return;
    }
    if (caller.sub === targetUserId) {
      return;
    }
    throw new ForbiddenException('You do not have access to this resource');
  }

  /**
   * Ownership check for PATCH /users/:id/profile (gap-fix Gap 1): HR/ADMIN always allowed, or the
   * user editing their own profile ("self"). Unlike assertCanView, there's no "manager-of" case
   * here — a manager may VIEW a report's profile (via assertCanView) but not edit it, per
   * docs/API_CONTRACT_GAPS_FIX.md.
   */
  assertCanEditProfile(caller: JwtUserPayload, targetUserId: number): void {
    if (caller.role === RoleName.HR || caller.role === RoleName.ADMIN) {
      return;
    }
    if (caller.sub === targetUserId) {
      return;
    }
    throw new ForbiddenException('You do not have access to this resource');
  }

  /**
   * GET /users/:id/profile — returns null if the profile was never filled in (no auto-create on
   * read), per docs/API_CONTRACT_GAPS_FIX.md Gap 1.
   */
  async getProfile(userId: number): Promise<EmployeeProfileDto | null> {
    await this.findOneEntity(userId); // 404s if the user doesn't exist
    const profile = await this.employeeProfilesRepo.findOne({ where: { userId } });
    return profile ? toEmployeeProfileDto(profile) : null;
  }

  /**
   * PATCH /users/:id/profile — upserts (creates the row on first write), partial update
   * semantics, same as LetterTemplate's PUT.
   */
  async upsertProfile(userId: number, dto: UpdateEmployeeProfileDto): Promise<EmployeeProfileDto> {
    await this.findOneEntity(userId); // 404s if the user doesn't exist

    let profile = await this.employeeProfilesRepo.findOne({ where: { userId } });
    if (!profile) {
      profile = this.employeeProfilesRepo.create({ userId });
    }

    if (dto.phone !== undefined) profile.phone = dto.phone;
    if (dto.address !== undefined) profile.address = dto.address;
    if (dto.dateOfBirth !== undefined) profile.dateOfBirth = dto.dateOfBirth;
    if (dto.gender !== undefined) profile.gender = dto.gender;
    if (dto.emergencyContactName !== undefined) {
      profile.emergencyContactName = dto.emergencyContactName;
    }
    if (dto.emergencyContactPhone !== undefined) {
      profile.emergencyContactPhone = dto.emergencyContactPhone;
    }
    if (dto.nationalId !== undefined) profile.nationalId = dto.nationalId;
    if (dto.bankName !== undefined) profile.bankName = dto.bankName;
    if (dto.bankAccountNumber !== undefined) profile.bankAccountNumber = dto.bankAccountNumber;

    const saved = await this.employeeProfilesRepo.save(profile);
    return toEmployeeProfileDto(saved);
  }
}
