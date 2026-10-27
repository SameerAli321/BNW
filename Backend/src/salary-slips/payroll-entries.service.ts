import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, LessThan, Repository } from 'typeorm';
import { PayrollEntry } from '../entities/payroll-entry.entity';
import { User } from '../entities/user.entity';
import { SecurityDeductionMode } from '../common/enums/salary-slip.enum';
import { weekdaysInMonth } from './salary-calc';

/** The typed-in cells of one payroll sheet row. */
export type PayrollEntryInputs = {
  grossSalary: number;
  workingDays: number;
  unpaidDays: number;
  securityMode: SecurityDeductionMode;
  securityAmount: number;
  tax: number;
  loanOverride: number | null;
  nonTaxableAddition: number;
  taxableAddition: number;
  paid: number;
};

export const pickInputs = (entry: PayrollEntry): PayrollEntryInputs => ({
  grossSalary: entry.grossSalary,
  workingDays: entry.workingDays,
  unpaidDays: entry.unpaidDays,
  securityMode: entry.securityMode,
  securityAmount: entry.securityAmount,
  tax: entry.tax,
  loanOverride: entry.loanOverride,
  nonTaxableAddition: entry.nonTaxableAddition,
  taxableAddition: entry.taxableAddition,
  paid: entry.paid,
});

/**
 * Payroll sheet rows. A month with no saved row starts from the employee's record and last
 * month's row: gross salary = current salary (else last month's), the same security deduction,
 * and the month's working days. Tax, unpaid holidays, additions and paid start at zero — they are
 * typed in fresh every month, as on the sheet.
 */
@Injectable()
export class PayrollEntriesService {
  constructor(@InjectRepository(PayrollEntry) private readonly repo: Repository<PayrollEntry>) {}

  async forMonth(employeeIds: number[], month: string): Promise<Map<number, PayrollEntry>> {
    if (!employeeIds.length) return new Map();
    const rows = await this.repo.find({
      where: { employeeId: In(employeeIds), salaryMonth: month },
    });
    return new Map(rows.map((row) => [row.employeeId, row]));
  }

  /** The sheet's "Number of working days": what most saved rows use, else Mon–Fri. */
  async workingDaysFor(month: string): Promise<number> {
    const row = await this.repo
      .createQueryBuilder('entry')
      .select('entry.workingDays', 'days')
      .addSelect('COUNT(*)', 'n')
      .where('entry.salaryMonth = :month', { month })
      .groupBy('entry.workingDays')
      .orderBy('n', 'DESC')
      .addOrderBy('days', 'DESC')
      .limit(1)
      .getRawOne<{ days: number }>();
    return row ? Number(row.days) : weekdaysInMonth(month);
  }

  /** Each employee's latest row before `month`. */
  private async previousRows(employeeIds: number[], month: string) {
    if (!employeeIds.length) return new Map<number, PayrollEntry>();
    const rows = await this.repo.find({
      where: { employeeId: In(employeeIds), salaryMonth: LessThan(month) },
      order: { salaryMonth: 'DESC' },
    });
    const latest = new Map<number, PayrollEntry>();
    for (const row of rows) if (!latest.has(row.employeeId)) latest.set(row.employeeId, row);
    return latest;
  }

  /** Saved inputs where there are some, otherwise the starting values described above. */
  async inputsFor(
    employees: Pick<User, 'id' | 'currentSalary'>[],
    month: string,
  ): Promise<Map<number, { inputs: PayrollEntryInputs; entry: PayrollEntry | null }>> {
    const ids = employees.map((e) => e.id);
    const [saved, previous, workingDays] = await Promise.all([
      this.forMonth(ids, month),
      this.previousRows(ids, month),
      this.workingDaysFor(month),
    ]);
    const result = new Map<number, { inputs: PayrollEntryInputs; entry: PayrollEntry | null }>();
    for (const employee of employees) {
      const entry = saved.get(employee.id) ?? null;
      if (entry) {
        result.set(employee.id, { inputs: pickInputs(entry), entry });
        continue;
      }
      const last = previous.get(employee.id);
      result.set(employee.id, {
        entry: null,
        inputs: {
          grossSalary: employee.currentSalary ?? last?.grossSalary ?? 0,
          workingDays,
          unpaidDays: 0,
          securityMode: last?.securityMode ?? SecurityDeductionMode.NONE,
          securityAmount:
            last?.securityMode === SecurityDeductionMode.MANUAL ? last.securityAmount : 0,
          tax: 0,
          loanOverride: null,
          nonTaxableAddition: 0,
          taxableAddition: 0,
          paid: 0,
        },
      });
    }
    return result;
  }

  /**
   * Adds an approved reimbursement to the employee's non-taxable addition for `month`, creating
   * their row with the usual starting values if it doesn't exist yet.
   */
  async addNonTaxable(
    employeeId: number,
    month: string,
    amount: number,
    updatedById: number,
  ): Promise<PayrollEntry> {
    const employee = await this.repo.manager
      .getRepository(User)
      .findOne({ where: { id: employeeId } });
    if (!employee) throw new Error(`Employee #${employeeId} not found`);
    const { inputs } = (await this.inputsFor([employee], month)).get(employeeId)!;
    return this.upsert(
      employeeId,
      month,
      {
        ...inputs,
        nonTaxableAddition:
          (Math.round(inputs.nonTaxableAddition * 100) + Math.round(amount * 100)) / 100,
      },
      updatedById,
    );
  }

  /** Insert or update one row (inside the caller's transaction when `manager` is given). */
  async upsert(
    employeeId: number,
    month: string,
    inputs: PayrollEntryInputs,
    updatedById: number,
    manager?: EntityManager,
  ): Promise<PayrollEntry> {
    const repo = manager ? manager.getRepository(PayrollEntry) : this.repo;
    const existing = await repo.findOne({ where: { employeeId, salaryMonth: month } });
    return repo.save(
      existing
        ? Object.assign(existing, inputs, { updatedById })
        : repo.create({ employeeId, salaryMonth: month, ...inputs, updatedById }),
    );
  }
}
