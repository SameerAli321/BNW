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
import { UserStatus } from '../common/enums/user-status.enum';
import { RoleName } from '../common/enums/role.enum';
import { toUserDto, UserDto } from '../common/mappers/user.mapper';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { generateTempPassword } from '../common/utils/temp-password';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly usersRepo: Repository<User>) {}

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

  async update(id: number, dto: UpdateUserDto): Promise<UserDto> {
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

    await this.usersRepo.save(user);
    return this.findOne(id);
  }

  async softDelete(id: number): Promise<void> {
    const user = await this.findOneEntity(id);
    user.status = UserStatus.INACTIVE;
    await this.usersRepo.save(user);
    await this.usersRepo.softDelete(id);
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
    if (caller.sub === targetUserId) {
      return;
    }
    const target = await this.usersRepo.findOne({ where: { id: targetUserId } });
    if (target && target.managerId === caller.sub) {
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
}
