import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Brackets, In, Repository } from 'typeorm';
import { WorkOrder } from '../entities/work-order.entity';
import { AppSetting } from '../entities/app-setting.entity';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import {
  EQUIPMENT_CATEGORIES,
  REIMBURSEMENT_CATEGORIES,
  WorkOrderStatus,
  WorkOrderType,
} from '../common/enums/work-order.enum';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { MailService } from '../mail/mail.service';
import { renderActionEmail } from '../mail/action-email';
import { EmailDetailRow } from '../mail/email-layout';
import {
  CreateWorkOrderDto,
  ProcessWorkOrderDto,
  QueryWorkOrdersDto,
  WorkOrderDecisionDto,
} from './dto/work-order.dto';
import { WORK_ORDER_RECEIPTS_DIR } from './receipt.storage';
import { RequestWatchersService } from '../notifications/request-watchers.service';
import { NotifyService } from '../notifications/notify.service';

export const CEO_LIMIT_KEY = 'work_orders.ceo_approval_limit';
const DEFAULT_CEO_LIMIT = 50_000;

const RELATIONS = ['employee', 'employee.department', 'manager', 'ceoUser', 'processor'];
const PENDING = [
  WorkOrderStatus.PENDING_MANAGER,
  WorkOrderStatus.PENDING_CEO,
  WorkOrderStatus.PENDING_PROCESSING,
];

/** Who does the final step: Payroll pays reimbursements, HR issues equipment (ADMIN can do both). */
export const PROCESSOR_ROLES: Record<WorkOrderType, string[]> = {
  [WorkOrderType.REIMBURSEMENT]: [RoleName.PAYROLL, RoleName.ADMIN],
  [WorkOrderType.EQUIPMENT]: [RoleName.HR, RoleName.ADMIN],
};

const TYPE_LABEL: Record<WorkOrderType, string> = {
  [WorkOrderType.REIMBURSEMENT]: 'reimbursement claim',
  [WorkOrderType.EQUIPMENT]: 'equipment request',
};

const fullName = (u: Pick<User, 'firstName' | 'lastName'> | null | undefined) =>
  u ? `${u.firstName} ${u.lastName}`.trim() : null;

export const formatPkr = (amount: number | null) =>
  amount === null
    ? '—'
    : `Rs ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export interface WorkOrderDto {
  id: number;
  type: WorkOrderType;
  title: string;
  category: string;
  description: string;
  amount: number | null;
  expenseDate: string | null;
  quantity: number | null;
  neededBy: string | null;
  hasReceipt: boolean;
  receiptOriginalName: string | null;
  status: WorkOrderStatus;
  ceoRequired: boolean;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  employeeDesignation: string | null;
  employeeDepartment: string | null;
  managerId: number | null;
  managerName: string | null;
  managerApproved: boolean | null;
  managerRemarks: string | null;
  managerSignatureText: string | null;
  managerSignedAt: string | null;
  ceoName: string | null;
  ceoApproved: boolean | null;
  ceoRemarks: string | null;
  ceoSignatureText: string | null;
  ceoSignedAt: string | null;
  processorName: string | null;
  processorApproved: boolean | null;
  processorRemarks: string | null;
  processorReference: string | null;
  processorSignatureText: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toWorkOrderDto(row: WorkOrder): WorkOrderDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    category: row.category,
    description: row.description,
    amount: row.amount,
    expenseDate: row.expenseDate,
    quantity: row.quantity,
    neededBy: row.neededBy,
    hasReceipt: !!row.receiptPath,
    receiptOriginalName: row.receiptOriginalName,
    status: row.status,
    ceoRequired: row.ceoRequired,
    employeeId: row.employeeId,
    employeeName: fullName(row.employee) ?? '',
    employeeCode: row.employee?.employeeCode ?? null,
    employeeDesignation: row.employee?.designation ?? null,
    employeeDepartment: row.employee?.department?.name ?? null,
    managerId: row.managerId,
    managerName: fullName(row.manager),
    managerApproved: row.managerApproved,
    managerRemarks: row.managerRemarks,
    managerSignatureText: row.managerSignatureText,
    managerSignedAt: iso(row.managerSignedAt),
    ceoName: fullName(row.ceoUser),
    ceoApproved: row.ceoApproved,
    ceoRemarks: row.ceoRemarks,
    ceoSignatureText: row.ceoSignatureText,
    ceoSignedAt: iso(row.ceoSignedAt),
    processorName: fullName(row.processor),
    processorApproved: row.processorApproved,
    processorRemarks: row.processorRemarks,
    processorReference: row.processorReference,
    processorSignatureText: row.processorSignatureText,
    processedAt: iso(row.processedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type ListScope =
  | { kind: 'mine'; userId: number }
  | { kind: 'team'; userId: number }
  | { kind: 'queue'; caller: JwtUserPayload }
  | { kind: 'all'; caller: JwtUserPayload };

/**
 * Work orders — reimbursement claims and equipment requests. Employee submits → line manager →
 * CEO (only when the amount is over the limit in app_settings) → Payroll pays a reimbursement /
 * HR or Admin issue equipment. Each step is notified in-app and by email.
 */
@Injectable()
export class WorkOrdersService {
  constructor(
    @InjectRepository(WorkOrder) private readonly repo: Repository<WorkOrder>,
    @InjectRepository(AppSetting) private readonly settingsRepo: Repository<AppSetting>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Notification) private readonly notificationsRepo: Repository<Notification>,
    private readonly mail: MailService,
    private readonly requestWatchers: RequestWatchersService,
    private readonly notifier: NotifyService,
  ) {}

  // --------------------------------------------------------------------------------------------
  // Settings

  async getSettings(): Promise<{
    ceoApprovalLimit: number;
    reimbursementCategories: readonly string[];
    equipmentCategories: readonly string[];
  }> {
    const row = await this.settingsRepo.findOne({ where: { key: CEO_LIMIT_KEY } });
    const limit = Number(row?.value ?? DEFAULT_CEO_LIMIT);
    return {
      ceoApprovalLimit: Number.isFinite(limit) ? limit : DEFAULT_CEO_LIMIT,
      reimbursementCategories: REIMBURSEMENT_CATEGORIES,
      equipmentCategories: EQUIPMENT_CATEGORIES,
    };
  }

  async updateSettings(ceoApprovalLimit: number) {
    await this.settingsRepo.save({ key: CEO_LIMIT_KEY, value: ceoApprovalLimit });
    return this.getSettings();
  }

  // --------------------------------------------------------------------------------------------
  // Reads

  /** Everyone involved can see it; Payroll sees reimbursements, HR / Admin / CEO see everything. */
  private canView(row: WorkOrder, caller: JwtUserPayload): boolean {
    if (row.employeeId === caller.sub || row.managerId === caller.sub) return true;
    if ([RoleName.HR, RoleName.ADMIN, RoleName.CEO].includes(caller.role as RoleName)) return true;
    return caller.role === RoleName.PAYROLL && row.type === WorkOrderType.REIMBURSEMENT;
  }

  async findEntityForViewer(id: number, caller: JwtUserPayload): Promise<WorkOrder> {
    const row = await this.repo.findOne({ where: { id }, relations: RELATIONS });
    if (!row) throw new NotFoundException('Work order not found');
    if (!this.canView(row, caller)) {
      throw new ForbiddenException('You do not have access to this work order');
    }
    return row;
  }

  async getOne(id: number, caller: JwtUserPayload): Promise<WorkOrderDto> {
    return toWorkOrderDto(await this.findEntityForViewer(id, caller));
  }

  async list(query: QueryWorkOrdersDto, scope: ListScope) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const qb = this.repo
      .createQueryBuilder('row')
      .leftJoinAndSelect('row.employee', 'employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('row.manager', 'manager')
      .leftJoinAndSelect('row.ceoUser', 'ceoUser')
      .leftJoinAndSelect('row.processor', 'processor')
      .orderBy('row.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (scope.kind === 'mine') qb.andWhere('row.employeeId = :uid', { uid: scope.userId });
    if (scope.kind === 'team') qb.andWhere('row.managerId = :uid', { uid: scope.userId });
    if (scope.kind === 'all' && scope.caller.role === RoleName.PAYROLL) {
      qb.andWhere('row.type = :reimb', { reimb: WorkOrderType.REIMBURSEMENT });
    }
    if (scope.kind === 'queue') {
      // Everything currently waiting on the caller, never their own request.
      const { caller } = scope;
      const processable = Object.values(WorkOrderType).filter((t) =>
        PROCESSOR_ROLES[t].includes(caller.role),
      );
      qb.andWhere('row.employeeId <> :uid', { uid: caller.sub }).andWhere(
        new Brackets((b) => {
          b.where('(row.status = :pm AND row.managerId = :uid)', {
            pm: WorkOrderStatus.PENDING_MANAGER,
            uid: caller.sub,
          });
          if (caller.role === RoleName.CEO) {
            b.orWhere('row.status = :pc', { pc: WorkOrderStatus.PENDING_CEO });
          }
          if (processable.length) {
            b.orWhere('(row.status = :pp AND row.type IN (:...types))', {
              pp: WorkOrderStatus.PENDING_PROCESSING,
              types: processable,
            });
          }
        }),
      );
    }

    if (query.type) qb.andWhere('row.type = :type', { type: query.type });
    if (query.status) qb.andWhere('row.status = :status', { status: query.status });
    if (query.q?.trim() && scope.kind !== 'mine') {
      qb.andWhere(
        new Brackets((b) =>
          b
            .where("(employee.firstName || ' ' || employee.lastName) ILIKE :q")
            .orWhere('employee.employeeCode ILIKE :q')
            .orWhere('row.title ILIKE :q'),
        ),
        { q: `%${query.q.trim()}%` },
      );
    }
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toWorkOrderDto), meta: { total, page, limit } };
  }

  // --------------------------------------------------------------------------------------------
  // Create

  async create(
    dto: CreateWorkOrderDto,
    receipt: Express.Multer.File | undefined,
    caller: JwtUserPayload,
  ): Promise<WorkOrderDto> {
    try {
      const employee = await this.usersRepo.findOne({ where: { id: caller.sub } });
      if (!employee) throw new NotFoundException('User not found');
      const isReimbursement = dto.type === WorkOrderType.REIMBURSEMENT;
      const categories: readonly string[] = isReimbursement
        ? REIMBURSEMENT_CATEGORIES
        : EQUIPMENT_CATEGORIES;
      if (!categories.includes(dto.category)) throw new BadRequestException('Choose a category');
      if (
        isReimbursement &&
        dto.expenseDate &&
        dto.expenseDate > new Date().toISOString().slice(0, 10)
      ) {
        throw new BadRequestException('The expense date cannot be in the future');
      }

      const { ceoApprovalLimit } = await this.getSettings();
      const amount = dto.amount ?? null;
      const ceoRequired =
        amount !== null && amount > ceoApprovalLimit && employee.role !== RoleName.CEO;
      const managerId =
        employee.managerId && employee.managerId !== employee.id ? employee.managerId : null;
      const status = managerId
        ? WorkOrderStatus.PENDING_MANAGER
        : ceoRequired
          ? WorkOrderStatus.PENDING_CEO
          : WorkOrderStatus.PENDING_PROCESSING;

      const saved = await this.repo.save(
        this.repo.create({
          employeeId: employee.id,
          type: dto.type,
          title: dto.title.trim(),
          category: dto.category,
          description: dto.description.trim(),
          amount,
          expenseDate: isReimbursement ? (dto.expenseDate ?? null) : null,
          quantity: isReimbursement ? null : (dto.quantity ?? 1),
          neededBy: isReimbursement ? null : (dto.neededBy ?? null),
          receiptPath: receipt ? join('work-order-receipts', receipt.filename) : null,
          receiptOriginalName: receipt?.originalname ?? null,
          receiptMime: receipt?.mimetype ?? null,
          status,
          ceoRequired,
          managerId,
        }),
      );
      const row = await this.findEntityForViewer(saved.id, caller);
      await this.notifyNextApprovers(row);
      this.requestWatchers.notifyNewRequest({
        requesterId: employee.id,
        requesterName: fullName(employee) ?? '',
        kind: isReimbursement ? 'Reimbursement claim' : 'Equipment request',
        summary: `${row.title} (${row.category})${amount !== null ? ` — ${formatPkr(amount)}` : ''}`,
        link: `/dashboard/work-orders/${row.id}`,
      });
      return toWorkOrderDto(row);
    } catch (error) {
      // Don't leave an orphaned upload behind if validation failed.
      if (receipt) this.removeFile(join('work-order-receipts', receipt.filename));
      throw error;
    }
  }

  async getReceipt(id: number, caller: JwtUserPayload) {
    const row = await this.findEntityForViewer(id, caller);
    if (!row.receiptPath) throw new NotFoundException('No receipt was attached');
    const absolutePath = join(WORK_ORDER_RECEIPTS_DIR, '..', row.receiptPath);
    if (!existsSync(absolutePath)) throw new NotFoundException('The receipt file is missing');
    return { row, absolutePath };
  }

  private removeFile(relativePath: string) {
    try {
      const path = join(WORK_ORDER_RECEIPTS_DIR, '..', relativePath);
      if (existsSync(path)) unlinkSync(path);
    } catch {
      // Best effort only.
    }
  }

  // --------------------------------------------------------------------------------------------
  // Decisions

  private async signer(caller: JwtUserPayload): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id: caller.sub } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async managerDecision(id: number, dto: WorkOrderDecisionDto, caller: JwtUserPayload) {
    const row = await this.findEntityForViewer(id, caller);
    if (row.status !== WorkOrderStatus.PENDING_MANAGER) {
      throw new ConflictException('This work order is not waiting for the manager');
    }
    if (row.managerId !== caller.sub) {
      throw new ForbiddenException("Only the employee's line manager can approve this step");
    }
    const now = new Date();
    const update: Partial<WorkOrder> = {
      managerApproved: dto.approved,
      managerRemarks: dto.remarks?.trim() || null,
      managerSignatureText: dto.signatureText.trim(),
      managerSignedAt: now,
    };
    if (!dto.approved) {
      update.status = WorkOrderStatus.REJECTED;
    } else if (row.ceoRequired && caller.role === RoleName.CEO) {
      // The manager *is* the CEO — one approval covers both steps.
      Object.assign(update, {
        ceoUserId: caller.sub,
        ceoApproved: true,
        ceoRemarks: dto.remarks?.trim() || null,
        ceoSignatureText: dto.signatureText.trim(),
        ceoSignedAt: now,
        status: WorkOrderStatus.PENDING_PROCESSING,
      });
    } else {
      update.status = row.ceoRequired
        ? WorkOrderStatus.PENDING_CEO
        : WorkOrderStatus.PENDING_PROCESSING;
    }
    await this.repo.update(id, update);
    return this.afterDecision(id, caller, dto.approved, 'your line manager', dto.remarks);
  }

  async ceoDecision(id: number, dto: WorkOrderDecisionDto, caller: JwtUserPayload) {
    if (caller.role !== RoleName.CEO)
      throw new ForbiddenException('Only the CEO can approve this step');
    const row = await this.findEntityForViewer(id, caller);
    if (row.status !== WorkOrderStatus.PENDING_CEO) {
      throw new ConflictException('This work order is not waiting for the CEO');
    }
    await this.repo.update(id, {
      ceoUserId: caller.sub,
      ceoApproved: dto.approved,
      ceoRemarks: dto.remarks?.trim() || null,
      ceoSignatureText: dto.signatureText.trim(),
      ceoSignedAt: new Date(),
      status: dto.approved ? WorkOrderStatus.PENDING_PROCESSING : WorkOrderStatus.REJECTED,
    });
    return this.afterDecision(id, caller, dto.approved, 'the CEO', dto.remarks);
  }

  async process(id: number, dto: ProcessWorkOrderDto, caller: JwtUserPayload) {
    const row = await this.findEntityForViewer(id, caller);
    if (row.status !== WorkOrderStatus.PENDING_PROCESSING) {
      throw new ConflictException('This work order is not ready for the final step yet');
    }
    if (!PROCESSOR_ROLES[row.type].includes(caller.role)) {
      throw new ForbiddenException(
        row.type === WorkOrderType.REIMBURSEMENT
          ? 'Only Payroll (or Admin) can pay a reimbursement'
          : 'Only HR (or Admin) can issue equipment',
      );
    }
    if (row.employeeId === caller.sub) {
      throw new ForbiddenException('You cannot approve your own request — ask a colleague');
    }
    await this.repo.update(id, {
      processorId: caller.sub,
      processorApproved: dto.approved,
      processorRemarks: dto.remarks?.trim() || null,
      processorReference: dto.reference?.trim() || null,
      processorSignatureText: dto.signatureText.trim(),
      processedAt: new Date(),
      status: dto.approved ? WorkOrderStatus.COMPLETED : WorkOrderStatus.REJECTED,
    });
    const who = row.type === WorkOrderType.REIMBURSEMENT ? 'Payroll' : 'HR';
    return this.afterDecision(id, caller, dto.approved, who, dto.remarks);
  }

  async cancel(id: number, caller: JwtUserPayload) {
    const row = await this.findEntityForViewer(id, caller);
    if (row.employeeId !== caller.sub)
      throw new ForbiddenException('Only the requester can cancel this');
    if (!PENDING.includes(row.status)) {
      throw new ConflictException('Only a pending work order can be cancelled');
    }
    await this.repo.update(id, { status: WorkOrderStatus.CANCELLED });
    // Tell whoever it was waiting on that they no longer need to act.
    const waitingOn =
      row.status === WorkOrderStatus.PENDING_MANAGER
        ? [row.managerId]
        : row.status === WorkOrderStatus.PENDING_CEO
          ? await this.notifier.activeUserIds([RoleName.CEO], caller.sub)
          : await this.notifier.activeUserIds(
              [...PROCESSOR_ROLES[row.type]] as RoleName[],
              caller.sub,
            );
    await this.notifier.send(waitingOn, {
      type: 'WORK_ORDER',
      title: `${fullName(row.employee)} cancelled their ${TYPE_LABEL[row.type]} "${row.title}"`,
      link: `/dashboard/work-orders/${row.id}`,
    });
    return this.getOne(id, caller);
  }

  /** Tell the employee what happened, and the next approvers (if any) that it's their turn. */
  private async afterDecision(
    id: number,
    caller: JwtUserPayload,
    approved: boolean,
    byWhom: string,
    remarks?: string,
  ): Promise<WorkOrderDto> {
    const row = await this.findEntityForViewer(id, caller);
    const label = TYPE_LABEL[row.type];
    let title: string;
    if (!approved) title = `Your ${label} "${row.title}" was not approved by ${byWhom}`;
    else if (row.status === WorkOrderStatus.COMPLETED) {
      title =
        row.type === WorkOrderType.REIMBURSEMENT
          ? `Your reimbursement "${row.title}" (${formatPkr(row.amount)}) has been approved for payment`
          : `Your equipment request "${row.title}" has been approved and issued`;
    } else
      title = `Your ${label} "${row.title}" was approved by ${byWhom} and moved to the next step`;

    await this.notify([row.employeeId], title, row, {
      heading: approved
        ? row.status === WorkOrderStatus.COMPLETED
          ? 'Approved'
          : 'Approved — next step'
        : 'Not approved',
      extraRows: remarks?.trim() ? [{ label: 'Remarks', value: remarks.trim() }] : [],
      emailToo: !approved || row.status === WorkOrderStatus.COMPLETED,
    });
    if (approved) await this.notifyNextApprovers(row);
    return toWorkOrderDto(row);
  }

  // --------------------------------------------------------------------------------------------
  // Notifications (in-app + email)

  private async activeUserIds(roles: string[], excludeId: number): Promise<number[]> {
    const users = await this.usersRepo.find({
      where: { role: In(roles as RoleName[]), status: UserStatus.ACTIVE },
    });
    return users.map((u) => u.id).filter((uid) => uid !== excludeId);
  }

  private async notifyNextApprovers(row: WorkOrder): Promise<void> {
    let ids: number[] = [];
    if (row.status === WorkOrderStatus.PENDING_MANAGER && row.managerId) ids = [row.managerId];
    if (row.status === WorkOrderStatus.PENDING_CEO)
      ids = await this.activeUserIds([RoleName.CEO], row.employeeId);
    if (row.status === WorkOrderStatus.PENDING_PROCESSING) {
      // New staff who do HR / Payroll are created as "HR/Admin" (ADMIN), so they're always
      // included alongside any older Payroll / HR accounts.
      const role = row.type === WorkOrderType.REIMBURSEMENT ? RoleName.PAYROLL : RoleName.HR;
      ids = await this.activeUserIds([role, RoleName.ADMIN], row.employeeId);
    }
    if (!ids.length) return;
    const name = fullName(row.employee);
    await this.notify(
      ids,
      `${name}'s ${TYPE_LABEL[row.type]} "${row.title}" needs your approval`,
      row,
      {
        heading: 'Needs your approval',
        emailToo: true,
      },
    );
  }

  private async notify(
    userIds: number[],
    title: string,
    row: WorkOrder,
    options: { heading: string; extraRows?: EmailDetailRow[]; emailToo: boolean },
  ): Promise<void> {
    if (!userIds.length) return;
    const link = `/dashboard/work-orders/${row.id}`;
    await this.notificationsRepo.save(
      userIds.map((userId) =>
        this.notificationsRepo.create({
          userId,
          type: 'WORK_ORDER',
          title: title.slice(0, 255),
          body: null,
          link,
        }),
      ),
    );
    if (!options.emailToo) return;

    const recipients = await this.usersRepo.find({ where: { id: In(userIds) } });
    const email = renderActionEmail({
      subject: title,
      heading: options.heading,
      intro: title,
      rows: [
        {
          label: 'Request',
          value: `${row.type === WorkOrderType.REIMBURSEMENT ? 'Reimbursement' : 'Equipment'} #${row.id} — ${row.category}`,
        },
        { label: 'Employee', value: fullName(row.employee) ?? '' },
        ...(row.amount !== null ? [{ label: 'Amount', value: formatPkr(row.amount) }] : []),
        ...(options.extraRows ?? []),
      ],
      link: this.mail.appUrl(link),
      buttonLabel: 'Open in BNW HR system',
    });
    // Don't make the approver wait for SMTP — MailService.send never throws.
    void this.mail.send({ to: recipients.map((u) => u.email), ...email });
  }
}
