import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import { Brackets, DataSource, In, IsNull, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { EmployeeProfile } from '../entities/employee-profile.entity';
import { SalarySlip } from '../entities/salary-slip.entity';
import { SalarySlipEmailStatus, SecurityDeductionMode } from '../common/enums/salary-slip.enum';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  CreateSalarySlipDto,
  UpdatePayrollEntryDto,
  PayrollWorkingDaysDto,
} from './dto/salary-slip.dto';
import { LoanInstalment, LoansService } from './loans.service';
import { PayrollEntriesService, PayrollEntryInputs } from './payroll-entries.service';
import {
  canManageSalarySlips,
  canViewPayroll,
  SalarySlipDto,
  SalarySlipsService,
  slipReference,
} from './salary-slips.service';
import {
  calculatePayroll,
  daysInMonth,
  formatSalaryMonth,
  maskAccountNumber,
  PayrollTotals,
} from './salary-calc';

const fullName = (u: Pick<User, 'firstName' | 'lastName'>) => `${u.firstName} ${u.lastName}`.trim();
const paisa = (value: number) => Math.round(value * 100);

/** The cells the accountant may fill in — "Give accountants access to this box only". */
const ACCOUNTANT_FIELDS: (keyof UpdatePayrollEntryDto)[] = ['tax', 'paid'];

/** Only the accountant may enter these — not HR or Admin either. */
const ACCOUNTANT_ONLY_FIELDS: (keyof UpdatePayrollEntryDto)[] = ['tax'];

const isAccountant = (caller: JwtUserPayload) => caller.role === RoleName.PAYROLL;

export interface PayrollRowDto {
  employeeId: number;
  employeeName: string;
  /** "Staff ID" on the sheet — the employee code. */
  staffId: string | null;
  designation: string | null;
  departmentName: string | null;
  /** "Id Card Number" — CNIC from the employee's profile. */
  nationalId: string | null;
  bankName: string | null;
  bankAccountNumberMasked: string | null;
  employeeStatus: UserStatus;
  /** False until someone saves the row (or generates the slip) — the figures are the defaults. */
  saved: boolean;
  inputs: PayrollEntryInputs;
  loan: LoanInstalment | null;
  /** What comes off this month: the override if set, else the scheduled instalment. */
  loanDeduction: number;
  calc: PayrollTotals;
  slip: {
    id: number;
    reference: string;
    revision: number;
    netSalary: number;
    emailStatus: SalarySlipEmailStatus;
    createdAt: string;
  } | null;
  /** The row changed after the slip was generated — regenerate to bring the slip up to date. */
  slipOutdated: boolean;
}

type PayrollTotalsRow = Record<
  | 'grossSalary'
  | 'taxableSalary'
  | 'unpaidDeduction'
  | 'securityDeduction'
  | 'tax'
  | 'loanDeduction'
  | 'nonTaxableAddition'
  | 'taxableAddition'
  | 'netSalary'
  | 'paid'
  | 'balance',
  number
>;

/**
 * The monthly payroll sheet ("Payroll for IT"): one row per employee with the sheet's columns, the
 * same formulas (salary-calc.ts → calculatePayroll) and a totals row. HR / Admin fill in every cell
 * and generate each employee's slip from their row; the accountant (PAYROLL role) fills in Tax and
 * Paid only.
 */
@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(EmployeeProfile) private readonly profilesRepo: Repository<EmployeeProfile>,
    @InjectRepository(SalarySlip) private readonly slipsRepo: Repository<SalarySlip>,
    private readonly dataSource: DataSource,
    private readonly entries: PayrollEntriesService,
    private readonly loans: LoansService,
    private readonly slips: SalarySlipsService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Everyone employed during the month, plus anyone who already has a row or slip for it. */
  private async sheetEmployees(month: string, onlyId?: number): Promise<User[]> {
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
    const qb = this.usersRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.department', 'department')
      .withDeleted()
      .where(
        new Brackets((b) =>
          b
            .where(
              new Brackets((employed) =>
                employed
                  .where('user.deletedAt IS NULL')
                  .andWhere('user.status = :active', { active: UserStatus.ACTIVE })
                  .andWhere('(user.joinDate IS NULL OR user.joinDate <= :monthEnd)', { monthEnd })
                  .andWhere('(user.leavingDate IS NULL OR user.leavingDate >= :monthStart)', {
                    monthStart,
                  }),
              ),
            )
            .orWhere(
              'user.id IN (SELECT e.employee_id FROM payroll_entries e WHERE e.salary_month = :month)',
              { month },
            )
            .orWhere(
              'user.id IN (SELECT s.employee_id FROM salary_slips s WHERE s.salary_month = :month AND s.superseded_at IS NULL)',
              { month },
            ),
        ),
      )
      .orderBy('user.employeeCode', 'ASC', 'NULLS LAST')
      .addOrderBy('user.firstName', 'ASC')
      .addOrderBy('user.lastName', 'ASC');
    if (onlyId) qb.andWhere('user.id = :onlyId', { onlyId });
    return qb.getMany();
  }

  private async buildRows(employees: User[], month: string): Promise<PayrollRowDto[]> {
    const ids = employees.map((e) => e.id);
    if (!ids.length) return [];
    const [inputs, loans, profiles, slips] = await Promise.all([
      this.entries.inputsFor(employees, month),
      this.loans.instalmentsFor(ids, month),
      this.profilesRepo.find({ where: { userId: In(ids) } }),
      this.slipsRepo.find({
        where: { employeeId: In(ids), salaryMonth: month, supersededAt: IsNull() },
      }),
    ]);
    const profileOf = new Map(profiles.map((p) => [p.userId, p]));
    const slipOf = new Map(slips.map((s) => [s.employeeId, s]));

    return employees.map((employee) => {
      const { inputs: row, entry } = inputs.get(employee.id)!;
      const loan = loans.get(employee.id) ?? null;
      const loanDeduction = row.loanOverride ?? loan?.amount ?? 0;
      const calc = calculatePayroll({ ...row, loanDeduction });
      const profile = profileOf.get(employee.id);
      const slip = slipOf.get(employee.id) ?? null;
      return {
        employeeId: employee.id,
        employeeName: fullName(employee),
        staffId: employee.employeeCode,
        designation: employee.designation,
        departmentName: employee.department?.name ?? null,
        nationalId: profile?.nationalId ?? null,
        bankName: profile?.bankName ?? null,
        bankAccountNumberMasked: maskAccountNumber(profile?.bankAccountNumber ?? null),
        employeeStatus: employee.deletedAt ? UserStatus.INACTIVE : employee.status,
        saved: !!entry,
        inputs: row,
        loan,
        loanDeduction,
        calc,
        slip: slip
          ? {
              id: slip.id,
              reference: slipReference(slip),
              revision: slip.revision,
              netSalary: slip.netSalary,
              emailStatus: slip.emailStatus,
              createdAt: slip.createdAt.toISOString(),
            }
          : null,
        slipOutdated:
          !!slip &&
          (paisa(slip.netSalary) !== paisa(calc.netSalary) ||
            paisa(slip.grossSalary) !== paisa(calc.totalEarnings) ||
            paisa(slip.totalDeductions) !== paisa(calc.totalDeductions)),
      };
    });
  }

  async getSheet(month: string, caller: JwtUserPayload) {
    this.assertCanView(caller);
    const rows = await this.buildRows(await this.sheetEmployees(month), month);
    const totals = rows.reduce<PayrollTotalsRow>(
      (sum, r) => {
        const add = (key: keyof PayrollTotalsRow, value: number) => {
          sum[key] = (paisa(sum[key]) + paisa(value)) / 100;
        };
        add('grossSalary', r.inputs.grossSalary);
        add('taxableSalary', r.calc.taxableSalary);
        add('unpaidDeduction', r.calc.unpaidDeduction);
        add('securityDeduction', r.calc.securityDeduction);
        add('tax', r.inputs.tax);
        add('loanDeduction', r.loanDeduction);
        add('nonTaxableAddition', r.inputs.nonTaxableAddition);
        add('taxableAddition', r.inputs.taxableAddition);
        add('netSalary', r.calc.netSalary);
        add('paid', r.inputs.paid);
        add('balance', r.calc.balance);
        return sum;
      },
      {
        grossSalary: 0,
        taxableSalary: 0,
        unpaidDeduction: 0,
        securityDeduction: 0,
        tax: 0,
        loanDeduction: 0,
        nonTaxableAddition: 0,
        taxableAddition: 0,
        netSalary: 0,
        paid: 0,
        balance: 0,
      },
    );
    return {
      month,
      monthLabel: formatSalaryMonth(month),
      workingDays: await this.entries.workingDaysFor(month),
      daysInMonth: daysInMonth(month),
      /** ALL = HR / Admin (every cell but Tax); TAX_AND_PAID = the accountant. */
      editable: canManageSalarySlips(caller) ? 'ALL' : 'TAX_AND_PAID',
      /** Tax is entered by the accountant only. */
      canEditTax: isAccountant(caller),
      rows,
      totals,
    };
  }

  /** The month's payroll as an .xlsx: Employee name and Net salary, with a total row. */
  async exportSheet(
    month: string,
    caller: JwtUserPayload,
  ): Promise<{ bytes: Buffer; filename: string }> {
    const sheet = await this.getSheet(month, caller);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BNW OMS';
    const ws = workbook.addWorksheet(sheet.monthLabel);
    ws.columns = [
      { header: 'Employee Name', key: 'name', width: 36 },
      { header: 'Net Salary', key: 'net', width: 18, style: { numFmt: '#,##0.00' } },
    ];
    ws.getRow(1).font = { bold: true };
    for (const row of sheet.rows) ws.addRow({ name: row.employeeName, net: row.calc.netSalary });
    const last = sheet.rows.length + 1;
    const total = ws.addRow({
      name: 'Total',
      net: { formula: `SUM(B2:B${last})`, result: sheet.totals.netSalary },
    });
    total.font = { bold: true };
    return {
      bytes: Buffer.from(await workbook.xlsx.writeBuffer()),
      filename: `Salaries-${month}.xlsx`,
    };
  }

  private async row(employeeId: number, month: string): Promise<PayrollRowDto> {
    const [employee] = await this.sheetEmployees(month, employeeId);
    if (!employee) {
      // Not on this month's sheet (joined later / left earlier) — still allow it if they exist.
      const user = await this.usersRepo.findOne({
        where: { id: employeeId },
        relations: ['department'],
      });
      if (!user) throw new NotFoundException('Employee not found');
      return (await this.buildRows([user], month))[0];
    }
    return (await this.buildRows([employee], month))[0];
  }

  /** Save the cells that changed on one row. */
  async updateEntry(employeeId: number, dto: UpdatePayrollEntryDto, caller: JwtUserPayload) {
    this.assertCanView(caller);
    const { month, ...cells } = dto;
    const changed = (Object.keys(cells) as (keyof typeof cells)[]).filter(
      (key) => cells[key] !== undefined,
    );
    if (!changed.length) return this.row(employeeId, month);
    if (!isAccountant(caller) && changed.some((key) => ACCOUNTANT_ONLY_FIELDS.includes(key))) {
      throw new ForbiddenException('Only the accountant can enter Tax on the payroll sheet');
    }
    if (!canManageSalarySlips(caller)) {
      const blocked = changed.filter((key) => !ACCOUNTANT_FIELDS.includes(key));
      if (blocked.length) {
        throw new ForbiddenException(
          'Accountants can only fill in Tax and Paid on the payroll sheet',
        );
      }
    }

    const current = await this.row(employeeId, month);
    const next: PayrollEntryInputs = { ...current.inputs };
    for (const key of changed) {
      const value = cells[key];
      if (key === 'securityMode') next.securityMode = value as SecurityDeductionMode;
      else if (key === 'loanOverride') next.loanOverride = value === null ? null : Number(value);
      else (next[key] as number) = Number(value);
    }
    if (next.securityMode !== SecurityDeductionMode.MANUAL) next.securityAmount = 0;
    if (next.workingDays > daysInMonth(month)) {
      throw new BadRequestException(
        `${formatSalaryMonth(month)} only has ${daysInMonth(month)} days`,
      );
    }
    if (next.unpaidDays > next.workingDays) {
      throw new BadRequestException('Unpaid holidays cannot be more than the working days');
    }
    if (next.loanOverride !== null) {
      this.loans.assertLoanDeduction(next.loanOverride, current.loan, current.employeeName);
    }

    await this.entries.upsert(employeeId, month, next, caller.sub);
    this.auditLog.log({
      actorId: caller.sub,
      action: 'PAYROLL_ENTRY_UPDATED',
      entity: 'payroll_entry',
      entityId: employeeId,
      before: Object.fromEntries(
        changed.map((key) => [key, current.inputs[key as keyof PayrollEntryInputs]]),
      ),
      after: {
        month,
        ...Object.fromEntries(changed.map((key) => [key, next[key as keyof PayrollEntryInputs]])),
      },
    });
    return this.row(employeeId, month);
  }

  /** Apply the month's working days to every row on the sheet. */
  async setWorkingDays(dto: PayrollWorkingDaysDto, caller: JwtUserPayload) {
    this.assertCanManage(caller);
    if (dto.workingDays > daysInMonth(dto.month)) {
      throw new BadRequestException(
        `${formatSalaryMonth(dto.month)} only has ${daysInMonth(dto.month)} days`,
      );
    }
    const rows = await this.buildRows(await this.sheetEmployees(dto.month), dto.month);
    const tooMany = rows.filter((r) => r.inputs.unpaidDays > dto.workingDays);
    if (tooMany.length) {
      throw new BadRequestException(
        `Unpaid holidays would be more than ${dto.workingDays} working days for ${tooMany
          .map((r) => r.employeeName)
          .join(', ')}`,
      );
    }
    await this.dataSource.transaction(async (manager) => {
      for (const r of rows) {
        await this.entries.upsert(
          r.employeeId,
          dto.month,
          { ...r.inputs, workingDays: dto.workingDays },
          caller.sub,
          manager,
        );
      }
    });
    this.auditLog.log({
      actorId: caller.sub,
      action: 'PAYROLL_WORKING_DAYS_SET',
      entity: 'payroll_entry',
      entityId: null,
      after: { month: dto.month, workingDays: dto.workingDays, rows: rows.length },
    });
    return this.getSheet(dto.month, caller);
  }

  /** Generate (or regenerate) the employee's salary slip from their row. */
  async generate(
    employeeId: number,
    month: string,
    regenerate: boolean | undefined,
    caller: JwtUserPayload,
  ): Promise<SalarySlipDto> {
    this.assertCanManage(caller);
    const { inputs } = await this.row(employeeId, month);
    const dto: CreateSalarySlipDto = Object.assign(new CreateSalarySlipDto(), {
      employeeId,
      salaryMonth: month,
      basicSalary: inputs.grossSalary,
      workingDays: inputs.workingDays,
      unpaidDays: inputs.unpaidDays,
      securityMode: inputs.securityMode,
      securityAmount: inputs.securityAmount,
      loanDeduction: inputs.loanOverride ?? undefined,
      nonTaxableAddition: inputs.nonTaxableAddition,
      taxableAddition: inputs.taxableAddition,
      regenerate,
    });
    return this.slips.create(dto, caller);
  }

  private assertCanView(caller: JwtUserPayload) {
    if (!canViewPayroll(caller)) {
      throw new ForbiddenException('Only HR, Admin or the accountant can open the payroll sheet');
    }
  }

  private assertCanManage(caller: JwtUserPayload) {
    if (!canManageSalarySlips(caller)) {
      throw new ForbiddenException('Only HR or Admin can do this');
    }
  }
}
