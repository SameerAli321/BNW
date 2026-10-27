import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FormAssignment } from '../entities/form-assignment.entity';
import { User } from '../entities/user.entity';
import { UserStatus } from '../common/enums/user-status.enum';
import { RoleName } from '../common/enums/role.enum';
import {
  FORM_ASSIGNMENT_FORMS,
  FormAssignmentStatus,
  FormAssignmentType,
} from '../common/enums/form-assignment.enum';
import { assertAttendanceRegularizationEnabled } from '../common/features/feature-flags';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { NotifyService } from '../notifications/notify.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  CreateFormAssignmentDto,
  FormAssignmentDto,
  QueryFormAssignmentsDto,
  QueryMyFormAssignmentsDto,
} from './dto/form-assignment.dto';

/** Where the bell / email sends the employee — their Requests & Forms page. */
const REQUESTS_FORMS_LINK = '/dashboard/requests-forms';

const fullName = (user: User | null | undefined) =>
  user ? `${user.firstName} ${user.lastName}`.trim() : null;

const isHrOrAdmin = (caller: JwtUserPayload) =>
  caller.role === RoleName.HR || caller.role === RoleName.ADMIN;

function toDto(row: FormAssignment): FormAssignmentDto {
  const form = FORM_ASSIGNMENT_FORMS[row.formType];
  return {
    id: row.id,
    userId: row.userId,
    userName: fullName(row.user) ?? 'Former employee',
    formType: row.formType,
    formLabel: form.label,
    message: row.message,
    dueDate: row.dueDate,
    status: row.status,
    assignedById: row.assignedById,
    assignedByName: fullName(row.assignedBy),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    link: form.link,
  };
}

/**
 * "HR sends a form": HR / Admin pick employees and a form, and each employee gets a PENDING row on
 * their Requests & Forms page plus a bell + email. The employee fills the form in through its own
 * page, then marks the assignment done (or HR / Admin do it for them, or cancel it).
 */
@Injectable()
export class FormAssignmentsService {
  constructor(
    @InjectRepository(FormAssignment)
    private readonly assignmentsRepo: Repository<FormAssignment>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly notify: NotifyService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async load(id: number): Promise<FormAssignment> {
    const row = await this.assignmentsRepo.findOne({
      where: { id },
      relations: ['user', 'assignedBy'],
      withDeleted: true,
    });
    if (!row) {
      throw new NotFoundException('Form assignment not found');
    }
    return row;
  }

  async create(dto: CreateFormAssignmentDto, caller: JwtUserPayload): Promise<FormAssignmentDto[]> {
    if (dto.formType === FormAssignmentType.ATTENDANCE_REGULARIZATION) {
      assertAttendanceRegularizationEnabled();
    }
    const userIds = [...new Set(dto.userIds)];
    const users = await this.usersRepo.find({
      where: { id: In(userIds), status: UserStatus.ACTIVE },
    });
    if (users.length !== userIds.length) {
      throw new BadRequestException('Some of the selected employees are not active users');
    }

    const message = dto.message?.trim() || null;
    const saved = await this.assignmentsRepo.save(
      userIds.map((userId) =>
        this.assignmentsRepo.create({
          userId,
          formType: dto.formType,
          message,
          dueDate: dto.dueDate ?? null,
          status: FormAssignmentStatus.PENDING,
          assignedById: caller.sub,
        }),
      ),
    );

    const form = FORM_ASSIGNMENT_FORMS[dto.formType];
    const sender = await this.usersRepo.findOne({ where: { id: caller.sub } });
    const senderName = fullName(sender) ?? 'HR';
    await this.notify.send(userIds, {
      type: 'FORM_ASSIGNMENT',
      title: `${senderName} asked you to fill in: ${form.label}`,
      body: message,
      heading: 'A form has been sent to you',
      link: REQUESTS_FORMS_LINK,
      rows: [
        { label: 'Form', value: form.label },
        { label: 'Sent by', value: senderName },
        ...(dto.dueDate ? [{ label: 'Due by', value: dto.dueDate }] : []),
      ],
    });

    for (const row of saved) {
      this.auditLogService.log({
        actorId: caller.sub,
        action: 'FORM_ASSIGNMENT_CREATED',
        entity: 'FormAssignment',
        entityId: row.id,
        after: { userId: row.userId, formType: row.formType, dueDate: row.dueDate },
      });
    }

    const rows = await this.assignmentsRepo.find({
      where: { id: In(saved.map((row) => row.id)) },
      relations: ['user', 'assignedBy'],
      order: { id: 'ASC' },
    });
    return rows.map(toDto);
  }

  async mine(
    query: QueryMyFormAssignmentsDto,
    caller: JwtUserPayload,
  ): Promise<{ data: FormAssignmentDto[] }> {
    const rows = await this.assignmentsRepo.find({
      where: { userId: caller.sub, ...(query.status ? { status: query.status } : {}) },
      relations: ['user', 'assignedBy'],
      withDeleted: true,
      order: { createdAt: 'DESC' },
    });
    return { data: rows.map(toDto) };
  }

  async list(query: QueryFormAssignmentsDto): Promise<{
    data: FormAssignmentDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;

    // Inner join so assignments of soft-deleted users drop out of the list.
    const qb = this.assignmentsRepo
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.user', 'user')
      .leftJoinAndSelect('assignment.assignedBy', 'assignedBy');

    if (query.status) {
      qb.andWhere('assignment.status = :status', { status: query.status });
    }
    if (query.formType) {
      qb.andWhere('assignment.formType = :formType', { formType: query.formType });
    }
    if (query.userId) {
      qb.andWhere('assignment.userId = :userId', { userId: query.userId });
    }

    qb.orderBy('assignment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toDto), meta: { total, page, limit } };
  }

  /** The assignee, or HR / Admin on their behalf. */
  async complete(id: number, caller: JwtUserPayload): Promise<FormAssignmentDto> {
    const row = await this.load(id);
    if (row.userId !== caller.sub && !isHrOrAdmin(caller)) {
      throw new ForbiddenException('This form was not sent to you');
    }
    if (row.status !== FormAssignmentStatus.PENDING) {
      throw new BadRequestException('This form is no longer pending');
    }
    row.status = FormAssignmentStatus.COMPLETED;
    row.completedAt = new Date();
    await this.assignmentsRepo.save(row);
    this.auditLogService.log({
      actorId: caller.sub,
      action: 'FORM_ASSIGNMENT_COMPLETED',
      entity: 'FormAssignment',
      entityId: row.id,
    });
    return toDto(await this.load(id));
  }

  /** HR / Admin. Tells the employee (bell only) they no longer need to fill it in. */
  async cancel(id: number, caller: JwtUserPayload): Promise<FormAssignmentDto> {
    const row = await this.load(id);
    if (row.status !== FormAssignmentStatus.PENDING) {
      throw new BadRequestException('Only a pending form can be cancelled');
    }
    row.status = FormAssignmentStatus.CANCELLED;
    await this.assignmentsRepo.save(row);
    this.auditLogService.log({
      actorId: caller.sub,
      action: 'FORM_ASSIGNMENT_CANCELLED',
      entity: 'FormAssignment',
      entityId: row.id,
    });
    await this.notify.send([row.userId], {
      type: 'FORM_ASSIGNMENT',
      title: `You no longer need to fill in: ${FORM_ASSIGNMENT_FORMS[row.formType].label}`,
      link: REQUESTS_FORMS_LINK,
      email: false,
    });
    return toDto(await this.load(id));
  }
}
