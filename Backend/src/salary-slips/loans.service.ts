import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EmployeeLoan } from '../entities/employee-loan.entity';
import { SalarySlip } from '../entities/salary-slip.entity';
import { User } from '../entities/user.entity';
import { EmployeeLoanStatus } from '../common/enums/salary-slip.enum';
import { JwtUserPayload } from '../common/decorators/current-user.decorator';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateLoanDto, QueryLoansDto } from './dto/salary-slip.dto';
import { formatSalaryAmount, formatSalaryMonth, nextLoanInstalment } from './salary-calc';

const paisa = (value: number) => Math.round(value * 100);
const fullName = (u: Pick<User, 'firstName' | 'lastName'>) => `${u.firstName} ${u.lastName}`.trim();

/** This month's instalment of an employee's loan, as of the slips generated for other months. */
export type LoanInstalment = {
  loanId: number;
  principal: number;
  instalments: number;
  /** Which instalment this month's would be (1-based). */
  instalmentNo: number;
  /** Recovered on the current slips of every other month. */
  recoveredBefore: number;
  remainingBefore: number;
  /** The scheduled deduction for this month. */
  amount: number;
};

export interface EmployeeLoanDto {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  principal: number;
  instalments: number;
  monthlyInstalment: number;
  startMonth: string;
  startMonthLabel: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  recovered: number;
  remaining: number;
  instalmentsPaid: number;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
}

type Recovery = { recovered: number; count: number; months: { month: string; amount: number }[] };

/**
 * Employee loans repaid from salary: Rs 100,000 on a 6-month plan comes off the next 6 salary slips
 * (from the start month) in equal parts. What has been repaid is always read from the current
 * slips, so regenerating a slip or skipping a month can never double-count or lose an instalment.
 */
@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(EmployeeLoan) private readonly repo: Repository<EmployeeLoan>,
    @InjectRepository(SalarySlip) private readonly slipsRepo: Repository<SalarySlip>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Loan deductions on current slips, per loan. */
  private async recoveries(loanIds: number[]): Promise<Map<number, Recovery>> {
    const result = new Map<number, Recovery>();
    if (!loanIds.length) return result;
    const rows = await this.slipsRepo
      .createQueryBuilder('slip')
      .select(['slip.loanId', 'slip.salaryMonth', 'slip.loanDeduction'])
      .where('slip.loanId IN (:...ids)', { ids: loanIds })
      .andWhere('slip.supersededAt IS NULL')
      .andWhere('slip.loanDeduction > 0')
      .getMany();
    for (const row of rows) {
      const entry = result.get(row.loanId!) ?? { recovered: 0, count: 0, months: [] };
      entry.months.push({ month: row.salaryMonth, amount: row.loanDeduction });
      entry.recovered = (paisa(entry.recovered) + paisa(row.loanDeduction)) / 100;
      entry.count += 1;
      result.set(row.loanId!, entry);
    }
    return result;
  }

  /**
   * This month's scheduled instalment for each employee that has an active loan which has started
   * by `month` and isn't repaid yet (ignoring `month`'s own slip, so a regeneration sees the same
   * instalment again).
   */
  async instalmentsFor(employeeIds: number[], month: string): Promise<Map<number, LoanInstalment>> {
    const result = new Map<number, LoanInstalment>();
    if (!employeeIds.length) return result;
    const loans = await this.repo.find({
      where: { employeeId: In(employeeIds), status: EmployeeLoanStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
    const recoveries = await this.recoveries(loans.map((l) => l.id));
    for (const loan of loans) {
      if (result.has(loan.employeeId) || loan.startMonth > month) continue;
      const others = (recoveries.get(loan.id)?.months ?? []).filter((m) => m.month !== month);
      const recoveredBefore = others.reduce((sum, m) => sum + paisa(m.amount), 0) / 100;
      const remainingBefore = (paisa(loan.principal) - paisa(recoveredBefore)) / 100;
      if (remainingBefore <= 0) continue;
      const earlier = others.filter((m) => m.month < month).length;
      result.set(loan.employeeId, {
        loanId: loan.id,
        principal: loan.principal,
        instalments: loan.instalments,
        instalmentNo: earlier + 1,
        recoveredBefore,
        remainingBefore,
        amount: nextLoanInstalment(
          loan.principal,
          loan.instalments,
          recoveredBefore,
          others.length,
        ),
      });
    }
    return result;
  }

  async instalmentFor(employeeId: number, month: string): Promise<LoanInstalment | null> {
    return (await this.instalmentsFor([employeeId], month)).get(employeeId) ?? null;
  }

  /** Checks a loan deduction typed in for a month against the employee's loan. */
  assertLoanDeduction(amount: number, instalment: LoanInstalment | null, employeeName: string) {
    if (amount <= 0) return;
    if (!instalment) {
      throw new BadRequestException(
        `${employeeName} has no loan to repay this month — add one under Salary slips → Loans first`,
      );
    }
    if (paisa(amount) > paisa(instalment.remainingBefore)) {
      throw new BadRequestException(
        `The loan deduction is more than what ${employeeName} still owes (${formatSalaryAmount(instalment.remainingBefore)})`,
      );
    }
  }

  // ----------------------------------------------------------------------------------------------

  private toDto(loan: EmployeeLoan, recovery: Recovery | undefined): EmployeeLoanDto {
    const recovered = recovery?.recovered ?? 0;
    const remaining = Math.max(0, (paisa(loan.principal) - paisa(recovered)) / 100);
    return {
      id: loan.id,
      employeeId: loan.employeeId,
      employeeName: loan.employee ? fullName(loan.employee) : `#${loan.employeeId}`,
      employeeCode: loan.employee?.employeeCode ?? null,
      principal: loan.principal,
      instalments: loan.instalments,
      monthlyInstalment: nextLoanInstalment(loan.principal, loan.instalments, 0, 0),
      startMonth: loan.startMonth,
      startMonthLabel: formatSalaryMonth(loan.startMonth),
      status:
        loan.status === EmployeeLoanStatus.CANCELLED
          ? 'CANCELLED'
          : remaining <= 0
            ? 'COMPLETED'
            : 'ACTIVE',
      recovered,
      remaining,
      instalmentsPaid: recovery?.count ?? 0,
      notes: loan.notes,
      createdByName: loan.createdBy ? fullName(loan.createdBy) : null,
      createdAt: loan.createdAt.toISOString(),
    };
  }

  async list(query: QueryLoansDto): Promise<EmployeeLoanDto[]> {
    const loans = await this.repo.find({
      where: query.employeeId ? { employeeId: query.employeeId } : {},
      relations: ['employee', 'createdBy'],
      withDeleted: true,
      order: { createdAt: 'DESC' },
    });
    const recoveries = await this.recoveries(loans.map((l) => l.id));
    const rows = loans.map((loan) => this.toDto(loan, recoveries.get(loan.id)));
    return query.includeClosed ? rows : rows.filter((row) => row.status === 'ACTIVE');
  }

  async create(dto: CreateLoanDto, caller: JwtUserPayload): Promise<EmployeeLoanDto> {
    const employee = await this.usersRepo.findOne({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    const open = (await this.list({ employeeId: employee.id })).find((l) => l.status === 'ACTIVE');
    if (open) {
      throw new ConflictException(
        `${fullName(employee)} is still repaying a loan (${formatSalaryAmount(open.remaining)} left). Cancel it or wait until it is repaid.`,
      );
    }
    const saved = await this.repo.save(
      this.repo.create({
        employeeId: employee.id,
        principal: Number(dto.principal),
        instalments: dto.instalments,
        startMonth: dto.startMonth,
        notes: dto.notes ?? null,
        createdById: caller.sub,
      }),
    );
    this.auditLog.log({
      actorId: caller.sub,
      action: 'EMPLOYEE_LOAN_CREATED',
      entity: 'employee_loan',
      entityId: saved.id,
      after: {
        employeeId: saved.employeeId,
        principal: saved.principal,
        instalments: saved.instalments,
        startMonth: saved.startMonth,
      },
    });
    return this.findOne(saved.id);
  }

  async findOne(id: number): Promise<EmployeeLoanDto> {
    const loan = await this.repo.findOne({
      where: { id },
      relations: ['employee', 'createdBy'],
      withDeleted: true,
    });
    if (!loan) throw new NotFoundException('Loan not found');
    return this.toDto(loan, (await this.recoveries([id])).get(id));
  }

  /** Stops future deductions. Instalments already on slips stay recovered. */
  async cancel(id: number, caller: JwtUserPayload): Promise<EmployeeLoanDto> {
    const loan = await this.findOne(id);
    if (loan.status !== 'ACTIVE') {
      throw new BadRequestException(
        loan.status === 'CANCELLED'
          ? 'This loan is already cancelled'
          : 'This loan is fully repaid',
      );
    }
    await this.repo.update(id, { status: EmployeeLoanStatus.CANCELLED });
    this.auditLog.log({
      actorId: caller.sub,
      action: 'EMPLOYEE_LOAN_CANCELLED',
      entity: 'employee_loan',
      entityId: id,
      before: { recovered: loan.recovered, remaining: loan.remaining },
    });
    return this.findOne(id);
  }
}
