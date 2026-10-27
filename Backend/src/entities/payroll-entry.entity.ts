import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SecurityDeductionMode } from '../common/enums/salary-slip.enum';
import { User } from './user.entity';

const money = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

/**
 * One employee's row on the monthly payroll sheet — the figures typed in (the sheet's "manual
 * inputs"). Everything else (unpaid salary, security %, taxable salary, net, balance) is calculated
 * from these on read. Generating a salary slip writes its figures back here, so the sheet and the
 * slip always agree. Amounts are PKR.
 */
@Entity('payroll_entries')
@Index(['employeeId', 'salaryMonth'], { unique: true })
export class PayrollEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_id', type: 'int' })
  employeeId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  /** 'YYYY-MM'. */
  @Index()
  @Column({ name: 'salary_month', type: 'varchar', length: 7 })
  salaryMonth: string;

  @Column({ name: 'gross_salary', type: 'numeric', precision: 12, scale: 2, transformer: money })
  grossSalary: number;

  @Column({ name: 'working_days', type: 'int' })
  workingDays: number;

  @Column({
    name: 'unpaid_days',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: money,
  })
  unpaidDays: number;

  @Column({
    name: 'security_mode',
    type: 'varchar',
    length: 12,
    default: SecurityDeductionMode.NONE,
  })
  securityMode: SecurityDeductionMode;

  /** The amount when securityMode is MANUAL. */
  @Column({
    name: 'security_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: money,
  })
  securityAmount: number;

  /** Entered by the accountant each month. */
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: money })
  tax: number;

  /** Null = take the next instalment from the employee's loan; a number overrides it this month. */
  @Column({
    name: 'loan_override',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: money,
  })
  loanOverride: number | null;

  @Column({
    name: 'non_taxable_addition',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: money,
  })
  nonTaxableAddition: number;

  @Column({
    name: 'taxable_addition',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: money,
  })
  taxableAddition: number;

  /** What was actually paid out — Balance = Net − Paid. Entered by the accountant. */
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: money })
  paid: number;

  @Column({ name: 'updated_by_id', type: 'int', nullable: true })
  updatedById: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
