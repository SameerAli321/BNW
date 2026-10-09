import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { existsSync, promises as fs } from 'fs';
import { join } from 'path';
import { Brackets, DataSource, IsNull, Repository } from 'typeorm';
import { SalaryLineItem, SalarySlip } from '../entities/salary-slip.entity';
import { User } from '../entities/user.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { Notification } from '../entities/notification.entity';
import { SalarySlipEmailStatus } from '../common/enums/salary-slip.enum';
import { RoleName } from '../common/enums/role.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { UPLOADS_ROOT_DIR } from '../employees/employee-documents.storage';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MailService } from '../mail/mail.service';
import { CreateSalarySlipDto, QuerySalarySlipsDto, SalaryLineItemDto } from './dto/salary-slip.dto';
import { SalarySlipPdfService } from './salary-slip-pdf.service';
import { ensureSalarySlipsDirExists, SALARY_SLIPS_DIR } from './salary-slip.storage';
import { renderSalarySlipEmail } from './salary-slip-email';
import {
  calculateSalary,
  daysInMonth,
  formatSalaryAmount,
  formatSalaryMonth,
  maskAccountNumber,
} from './salary-calc';

/** Who can generate, see everyone's, and send salary slips. Everyone else sees only their own. */
export const SALARY_SLIP_MANAGER_ROLES: string[] = [RoleName.HR, RoleName.ADMIN];

export const canManageSalarySlips = (caller: JwtUserPayload) =>
  SALARY_SLIP_MANAGER_ROLES.includes(caller.role);

const fullName = (u: Pick<User, 'firstName' | 'lastName'>) => `${u.firstName} ${u.lastName}`.trim();
const iso = (d: Date | null) => (d ? d.toISOString() : null);
const slipReference = (slip: Pick<SalarySlip, 'id' | 'revision'>) =>
  `SS-${String(slip.id).padStart(6, '0')}${slip.revision > 1 ? `-R${slip.revision}` : ''}`;

export interface SalarySlipDto {
  id: number;
  reference: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  designation: string | null;
  departmentName: string | null;
  salaryMonth: string;
  salaryMonthLabel: string;
  revision: number;
  isCurrent: boolean;
  basicSalary: number;
  allowances: SalaryLineItem[];
  bonus: number;
  overtime: number;
  deductions: SalaryLineItem[];
  tax: number;
  totalAllowances: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  paymentDate: string | null;
  paymentMethod: string | null;
  bankName: string | null;
  bankAccountNumberMasked: string | null;
  workingDays: number | null;
  notes: string | null;
  emailStatus: SalarySlipEmailStatus;
  emailedTo: string | null;
  emailSentAt: string | null;
  emailError: string | null;
  emailAttempts: number;
  lastEmailAttemptAt: string | null;
  generatedByName: string | null;
  supersededAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toSalarySlipDto(row: SalarySlip, viewer?: JwtUserPayload): SalarySlipDto {
  // Delivery errors are SMTP detail for HR — an employee only needs the status.
  const showDeliveryDetail = !viewer || canManageSalarySlips(viewer);
  return {
    id: row.id,
    reference: slipReference(row),
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    employeeCode: row.employeeCode,
    designation: row.designation,
    departmentName: row.departmentName,
    salaryMonth: row.salaryMonth,
    salaryMonthLabel: formatSalaryMonth(row.salaryMonth),
    revision: row.revision,
    isCurrent: row.supersededAt === null,
    basicSalary: row.basicSalary,
    allowances: row.allowances ?? [],
    bonus: row.bonus,
    overtime: row.overtime,
    deductions: row.deductions ?? [],
    tax: row.tax,
    totalAllowances: row.totalAllowances,
    grossSalary: row.grossSalary,
    totalDeductions: row.totalDeductions,
    netSalary: row.netSalary,
    paymentDate: row.paymentDate,
    paymentMethod: row.paymentMethod,
    bankName: row.bankName,
    bankAccountNumberMasked: maskAccountNumber(row.bankAccountNumber),
    workingDays: row.workingDays,
    notes: row.notes,
    emailStatus: row.emailStatus,
    emailedTo: row.emailedTo,
    emailSentAt: iso(row.emailSentAt),
    emailError: showDeliveryDetail ? row.emailError : null,
    emailAttempts: row.emailAttempts,
    lastEmailAttemptAt: iso(row.lastEmailAttemptAt),
    generatedByName: row.generatedBy ? fullName(row.generatedBy) : null,
    supersededAt: iso(row.supersededAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type ListScope = { kind: 'all' } | { kind: 'mine'; userId: number };

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const cleanItems = (items: SalaryLineItemDto[] | undefined): SalaryLineItem[] =>
  (items ?? []).map((item) => ({ label: item.label.trim(), amount: Number(item.amount) }));

/**
 * Salary slips: HR / Admin pick an employee and month, enter the figures (pre-filled from the last
 * slip), and the server calculates the totals, stores the slip and renders its PDF. The PDF is
 * then emailed to the employee's registered address on request; the result (SENT / FAILED +
 * error) is saved so a failed send can be retried. Employees see only their own current slips.
 */
@Injectable()
export class SalarySlipsService {
  private readonly logger = new Logger(SalarySlipsService.name);
  /** Slip ids with a send in flight — stops a double-click emailing the employee twice. */
  private readonly sending = new Set<number>();

  constructor(
    @InjectRepository(SalarySlip) private readonly repo: Repository<SalarySlip>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(EmployeeProfile) private readonly profilesRepo: Repository<EmployeeProfile>,
    @InjectRepository(Notification) private readonly notificationsRepo: Repository<Notification>,
    private readonly dataSource: DataSource,
    private readonly pdf: SalarySlipPdfService,
    private readonly mail: MailService,
    private readonly auditLog: AuditLogService,
  ) {}

  // --------------------------------------------------------------------------------------------
  // Reads

  private async findEmployee(employeeId: number): Promise<User> {
    const employee = await this.usersRepo.findOne({
      where: { id: employeeId },
      relations: ['department'],
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  private findCurrent(employeeId: number, salaryMonth: string): Promise<SalarySlip | null> {
    return this.repo.findOne({
      where: { employeeId, salaryMonth, supersededAt: IsNull() },
      relations: ['generatedBy'],
    });
  }

  /** What the generate form starts from: the employee, this month's slip (if any), and the last one. */
  async getDefaults(employeeId: number, salaryMonth: string | undefined) {
    const employee = await this.findEmployee(employeeId);
    const profile = await this.profilesRepo.findOne({ where: { userId: employeeId } });
    const month = salaryMonth ?? currentMonth();
    const existing = await this.findCurrent(employeeId, month);
    const previous = await this.repo.findOne({
      where: { employeeId, supersededAt: IsNull() },
      relations: ['generatedBy'],
      order: { salaryMonth: 'DESC', createdAt: 'DESC' },
    });
    return {
      employee: {
        id: employee.id,
        name: fullName(employee),
        employeeCode: employee.employeeCode,
        designation: employee.designation,
        departmentName: employee.department?.name ?? null,
        email: employee.email,
        status: employee.status,
        joinDate: employee.joinDate,
        bankName: profile?.bankName ?? null,
        bankAccountNumberMasked: maskAccountNumber(profile?.bankAccountNumber ?? null),
        currentSalary: employee.currentSalary,
        deductionPolicy: employee.deductionPolicy,
      },
      salaryMonth: month,
      daysInMonth: daysInMonth(month),
      existing: existing ? toSalarySlipDto(existing) : null,
      previous: previous ? toSalarySlipDto(previous) : null,
    };
  }

  async list(query: QuerySalarySlipsDto, scope: ListScope, viewer: JwtUserPayload) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const qb = this.repo
      .createQueryBuilder('slip')
      .leftJoinAndSelect('slip.generatedBy', 'generatedBy')
      .orderBy('slip.salaryMonth', 'DESC')
      .addOrderBy('slip.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (scope.kind === 'mine') {
      qb.andWhere('slip.employeeId = :uid', { uid: scope.userId });
      qb.andWhere('slip.supersededAt IS NULL');
    } else {
      if (!query.includeSuperseded) qb.andWhere('slip.supersededAt IS NULL');
      if (query.employeeId) qb.andWhere('slip.employeeId = :eid', { eid: query.employeeId });
      if (query.emailStatus) qb.andWhere('slip.emailStatus = :es', { es: query.emailStatus });
      if (query.q?.trim()) {
        qb.andWhere(
          new Brackets((b) =>
            b
              .where('slip.employeeName ILIKE :q')
              .orWhere('slip.employeeCode ILIKE :q')
              .orWhere('slip.departmentName ILIKE :q'),
          ),
          { q: `%${query.q.trim()}%` },
        );
      }
    }
    if (query.salaryMonth) qb.andWhere('slip.salaryMonth = :m', { m: query.salaryMonth });

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => toSalarySlipDto(row, viewer)),
      meta: { total, page, limit },
    };
  }

  /** HR / Admin see any slip; everyone else only their own current ones. */
  async findForViewer(id: number, caller: JwtUserPayload): Promise<SalarySlip> {
    const slip = await this.repo.findOne({ where: { id }, relations: ['generatedBy'] });
    if (!slip) throw new NotFoundException('Salary slip not found');
    if (canManageSalarySlips(caller)) return slip;
    if (slip.employeeId !== caller.sub || slip.supersededAt !== null) {
      // Same answer as "not found" so ids can't be probed.
      throw new NotFoundException('Salary slip not found');
    }
    return slip;
  }

  async getOne(id: number, caller: JwtUserPayload): Promise<SalarySlipDto> {
    return toSalarySlipDto(await this.findForViewer(id, caller), caller);
  }

  /** The stored PDF — re-rendered (and re-saved) if the file was lost. */
  async getPdf(id: number, caller: JwtUserPayload): Promise<{ bytes: Buffer; filename: string }> {
    const slip = await this.findForViewer(id, caller);
    return { bytes: await this.loadPdf(slip), filename: this.pdfFilename(slip) };
  }

  pdfFilename(slip: SalarySlip): string {
    const name = slip.employeeName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `Salary-Slip-${slip.salaryMonth}-${name || slip.employeeId}${slip.revision > 1 ? `-R${slip.revision}` : ''}.pdf`;
  }

  private async loadPdf(slip: SalarySlip): Promise<Buffer> {
    if (slip.pdfPath) {
      const absolute = join(UPLOADS_ROOT_DIR, slip.pdfPath);
      if (existsSync(absolute)) return fs.readFile(absolute);
    }
    return this.renderAndStore(slip);
  }

  private async renderAndStore(slip: SalarySlip): Promise<Buffer> {
    const bytes = Buffer.from(await this.pdf.render(slip));
    try {
      ensureSalarySlipsDirExists();
      const filename = `${randomUUID()}.pdf`;
      await fs.writeFile(join(SALARY_SLIPS_DIR, filename), bytes);
      const pdfPath = join('salary-slips', filename);
      await this.repo.update(slip.id, { pdfPath });
      slip.pdfPath = pdfPath;
    } catch (error) {
      // The slip is still usable — the PDF is rendered again next time it's needed.
      this.logger.error(`Could not store salary slip PDF #${slip.id}: ${(error as Error).message}`);
    }
    return bytes;
  }

  // --------------------------------------------------------------------------------------------
  // Generate

  async create(dto: CreateSalarySlipDto, caller: JwtUserPayload): Promise<SalarySlipDto> {
    this.assertCanManage(caller);
    if (dto.salaryMonth > currentMonth()) {
      throw new BadRequestException('You cannot generate a salary slip for a future month');
    }
    const employee = await this.findEmployee(dto.employeeId);
    if (employee.joinDate && dto.salaryMonth < employee.joinDate.slice(0, 7)) {
      throw new BadRequestException(
        `${fullName(employee)} joined on ${employee.joinDate} — choose a month from then onwards`,
      );
    }
    if (dto.workingDays !== undefined && dto.workingDays > daysInMonth(dto.salaryMonth)) {
      throw new BadRequestException(
        `${formatSalaryMonth(dto.salaryMonth)} only has ${daysInMonth(dto.salaryMonth)} days`,
      );
    }

    const inputs = {
      basicSalary: Number(dto.basicSalary),
      allowances: cleanItems(dto.allowances),
      bonus: Number(dto.bonus ?? 0),
      overtime: Number(dto.overtime ?? 0),
      deductions: cleanItems(dto.deductions),
      tax: Number(dto.tax ?? 0),
    };
    const totals = calculateSalary(inputs);
    if (totals.grossSalary <= 0) {
      throw new BadRequestException('The gross salary must be more than zero');
    }
    if (totals.netSalary < 0) {
      throw new BadRequestException(
        `Deductions (${formatSalaryAmount(totals.totalDeductions)}) are more than the gross salary (${formatSalaryAmount(totals.grossSalary)})`,
      );
    }

    const profile = await this.profilesRepo.findOne({ where: { userId: employee.id } });
    const monthLabel = formatSalaryMonth(dto.salaryMonth);

    let saved: SalarySlip;
    let replaced: SalarySlip | null = null;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(SalarySlip);
        // Lock the current slip (if any) so two regenerations can't both supersede it.
        const existing = await repo
          .createQueryBuilder('slip')
          .setLock('pessimistic_write')
          .where('slip.employeeId = :eid AND slip.salaryMonth = :m AND slip.supersededAt IS NULL', {
            eid: employee.id,
            m: dto.salaryMonth,
          })
          .getOne();
        if (existing && !dto.regenerate) {
          throw new ConflictException(
            `A salary slip for ${monthLabel} already exists for ${fullName(employee)} (${slipReference(existing)}). Choose "Regenerate" to replace it with a revised slip.`,
          );
        }
        const { maxRevision } = (await repo
          .createQueryBuilder('slip')
          .select('COALESCE(MAX(slip.revision), 0)', 'maxRevision')
          .where('slip.employeeId = :eid AND slip.salaryMonth = :m', {
            eid: employee.id,
            m: dto.salaryMonth,
          })
          .getRawOne<{ maxRevision: string }>()) ?? { maxRevision: '0' };
        if (existing) {
          await repo.update(existing.id, { supersededAt: new Date() });
          replaced = existing;
        }
        return repo.save(
          repo.create({
            employeeId: employee.id,
            salaryMonth: dto.salaryMonth,
            revision: Number(maxRevision) + 1,
            employeeName: fullName(employee),
            employeeCode: employee.employeeCode,
            designation: employee.designation,
            departmentName: employee.department?.name ?? null,
            ...inputs,
            ...totals,
            paymentDate: dto.paymentDate ?? null,
            paymentMethod:
              dto.paymentMethod ?? (profile?.bankAccountNumber ? 'Bank transfer' : null),
            bankName: profile?.bankName ?? null,
            bankAccountNumber: profile?.bankAccountNumber ?? null,
            workingDays: dto.workingDays ?? null,
            notes: dto.notes?.trim() || null,
            emailStatus: SalarySlipEmailStatus.NOT_SENT,
            generatedById: caller.sub,
          }),
        );
      });
    } catch (error) {
      // The partial unique index caught a race between two "generate" clicks.
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          `A salary slip for ${monthLabel} was just generated for ${fullName(employee)}. Refresh to see it.`,
        );
      }
      throw error;
    }

    const slip = await this.repo.findOneOrFail({
      where: { id: saved.id },
      relations: ['generatedBy'],
    });
    await this.renderAndStore(slip);

    const previous = replaced as SalarySlip | null;
    this.auditLog.log({
      actorId: caller.sub,
      action: previous ? 'SALARY_SLIP_REGENERATED' : 'SALARY_SLIP_GENERATED',
      entity: 'salary_slip',
      entityId: slip.id,
      before: previous
        ? { id: previous.id, revision: previous.revision, netSalary: previous.netSalary }
        : null,
      after: {
        employeeId: slip.employeeId,
        salaryMonth: slip.salaryMonth,
        revision: slip.revision,
        grossSalary: slip.grossSalary,
        totalDeductions: slip.totalDeductions,
        netSalary: slip.netSalary,
      },
    });
    return toSalarySlipDto(slip, caller);
  }

  // --------------------------------------------------------------------------------------------
  // Email

  /** Emails the PDF to the employee's registered address. Also used for "Resend". */
  async send(id: number, caller: JwtUserPayload): Promise<SalarySlipDto> {
    this.assertCanManage(caller);
    if (this.sending.has(id)) {
      throw new ConflictException('This salary slip is already being sent — please wait');
    }
    this.sending.add(id);
    try {
      const slip = await this.findForViewer(id, caller);
      if (slip.supersededAt) {
        throw new BadRequestException(
          'This salary slip was replaced by a newer revision — send the current one instead',
        );
      }
      const employee = await this.usersRepo.findOne({
        where: { id: slip.employeeId },
        withDeleted: true,
      });
      if (!employee || employee.deletedAt) {
        throw new BadRequestException("This employee's account has been removed");
      }
      const to = employee.email?.trim();
      if (!to) throw new BadRequestException('This employee has no registered email address');

      const bytes = await this.loadPdf(slip);
      const email = renderSalarySlipEmail({
        employeeName: slip.employeeName,
        firstName: employee.firstName,
        salaryMonth: slip.salaryMonth,
        reference: slipReference(slip),
        designation: slip.designation,
        revision: slip.revision,
        link: this.mail.appUrl('/dashboard/salary-slips'),
      });
      const result = await this.mail.send({
        to,
        ...email,
        attachments: [
          { filename: this.pdfFilename(slip), content: bytes, contentType: 'application/pdf' },
        ],
      });

      const now = new Date();
      const isResend = slip.emailAttempts > 0;
      slip.emailAttempts += 1;
      slip.lastEmailAttemptAt = now;
      slip.emailedTo = to;
      if (result.status === 'SENT') {
        slip.emailStatus = SalarySlipEmailStatus.SENT;
        slip.emailSentAt = now;
        slip.emailError = null;
      } else {
        slip.emailStatus = SalarySlipEmailStatus.FAILED;
        slip.emailError =
          result.status === 'FAILED'
            ? result.error.slice(0, 2000)
            : 'Email is not set up on the server (SMTP settings are missing in Backend/.env)';
      }
      await this.repo.update(slip.id, {
        emailAttempts: slip.emailAttempts,
        lastEmailAttemptAt: slip.lastEmailAttemptAt,
        emailedTo: slip.emailedTo,
        emailStatus: slip.emailStatus,
        emailSentAt: slip.emailSentAt,
        emailError: slip.emailError,
      });

      this.auditLog.log({
        actorId: caller.sub,
        action:
          slip.emailStatus === SalarySlipEmailStatus.SENT
            ? isResend
              ? 'SALARY_SLIP_RESENT'
              : 'SALARY_SLIP_EMAILED'
            : 'SALARY_SLIP_EMAIL_FAILED',
        entity: 'salary_slip',
        entityId: slip.id,
        after: {
          to,
          status: slip.emailStatus,
          attempt: slip.emailAttempts,
          error: slip.emailError,
        },
      });
      if (slip.emailStatus === SalarySlipEmailStatus.SENT) {
        await this.notificationsRepo
          .save(
            this.notificationsRepo.create({
              userId: slip.employeeId,
              type: 'SALARY_SLIP',
              title: `Your salary slip for ${formatSalaryMonth(slip.salaryMonth)} is ready`.slice(
                0,
                255,
              ),
              body: null,
              link: '/dashboard/salary-slips',
            }),
          )
          .catch((error: Error) =>
            this.logger.warn(`Salary slip notification failed: ${error.message}`),
          );
      }

      const fresh = await this.repo.findOneOrFail({
        where: { id: slip.id },
        relations: ['generatedBy'],
      });
      return toSalarySlipDto(fresh, caller);
    } finally {
      this.sending.delete(id);
    }
  }

  /** Only HR / Admin may send; kept here so the controller and tests share one rule. */
  assertCanManage(caller: JwtUserPayload): void {
    if (!canManageSalarySlips(caller)) {
      throw new ForbiddenException('Only HR or Admin can manage salary slips');
    }
  }
}
