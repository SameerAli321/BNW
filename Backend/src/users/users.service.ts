import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { UserStatus } from '../common/enums/user-status.enum';
import { RoleName } from '../common/enums/role.enum';
import { toUserDto, UserDto } from '../common/mappers/user.mapper';
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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(EmployeeProfile)
    private readonly employeeProfilesRepo: Repository<EmployeeProfile>,
    private readonly auditLogService: AuditLogService,
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

    return {
      data: rows.map(toUserDto),
      meta: { total, page, limit },
    };
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

  async findOne(id: number): Promise<UserDto> {
    return toUserDto(await this.findOneEntity(id));
  }

  async findReports(id: number): Promise<UserDto[]> {
    // Ensure the "manager" user itself exists first, so /users/:id/reports 404s cleanly.
    await this.findOneEntity(id);
    const reports = await this.usersRepo.find({
      where: { managerId: id },
      relations: ['manager', 'department'],
      order: { firstName: 'ASC' },
    });
    return reports.map(toUserDto);
  }

  /**
   * Creates a user with a server-generated temporary password.
   * NOTE: real SMTP delivery is not wired up yet (per the guide's Phase 1 plan — Nodemailer + SMTP
   * comes later). For now the temp password is logged to the console so it can be used for manual
   * testing; replace this with a real "set your password" email service in a later sprint.
   */
  async create(dto: CreateUserDto): Promise<{ user: UserDto; tempPassword: string }> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const tempPassword = generateTempPassword();
    const password_hash = await bcrypt.hash(tempPassword, 10);

    const user = this.usersRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      role: dto.role,
      managerId: dto.managerId ?? null,
      departmentId: dto.departmentId ?? null,
      designation: dto.designation ?? null,
      joinDate: dto.joinDate ?? null,
      employeeCode: dto.employeeCode ?? null,
      status: UserStatus.ONBOARDING,
      mustChangePassword: true,
      password_hash,
    });

    const saved = await this.usersRepo.save(user);

    // STUB: replace with a real mail service call (SMTP) in a later sprint.
    // eslint-disable-next-line no-console
    console.log(
      `[stub email] "Set your password" -> ${saved.email} | temp password: ${tempPassword}`,
    );

    const full = await this.findOneEntity(saved.id);
    return { user: toUserDto(full), tempPassword };
  }

  async update(id: number, dto: UpdateUserDto, actorId?: number): Promise<UserDto> {
    const user = await this.findOneEntity(id);

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
    if (dto.employeeCode !== undefined) user.employeeCode = dto.employeeCode;
    if (dto.status !== undefined) user.status = dto.status;

    let passwordChanged = false;
    if (dto.password) {
      user.password_hash = await bcrypt.hash(dto.password, 10);
      user.mustChangePassword = true;
      passwordChanged = true;
    }

    await this.usersRepo.save(user);

    if (passwordChanged) {
      this.auditLogService.log({
        actorId: actorId ?? null,
        action: 'PASSWORD_CHANGED',
        entity: 'User',
        entityId: user.id,
      });
    }

    return this.findOne(id);
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
