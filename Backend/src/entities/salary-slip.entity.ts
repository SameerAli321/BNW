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
import { SalarySlipEmailStatus } from '../common/enums/salary-slip.enum';
import { User } from './user.entity';

const money = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

/** A named amount on the slip, e.g. { label: 'House rent', amount: 15000 }. */
export type SalaryLineItem = { label: string; amount: number };

/**
 * One employee's salary slip for one month. Employee details are copied onto the row when it's
 * generated so an old slip still shows what was true that month. Only one *current* slip per
 * employee + month (partial unique index on superseded_at IS NULL); regenerating marks the old one
 * superseded and adds a new revision, so history is never overwritten. Amounts are PKR.
 */
@Entity('salary_slips')
export class SalarySlip {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'employee_id', type: 'int' })
  employeeId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  /** 'YYYY-MM'. */
  @Index()
  @Column({ name: 'salary_month', type: 'varchar', length: 7 })
  salaryMonth: string;

  @Column({ type: 'int', default: 1 })
  revision: number;

  // --- Employee details at the time of generation ---
  @Column({ name: 'employee_name', type: 'varchar', length: 201 })
  employeeName: string;

  @Column({ name: 'employee_code', type: 'varchar', length: 30, nullable: true })
  employeeCode: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  designation: string | null;

  @Column({ name: 'department_name', type: 'varchar', length: 150, nullable: true })
  departmentName: string | null;

  // --- Earnings ---
  @Column({ name: 'basic_salary', type: 'numeric', precision: 12, scale: 2, transformer: money })
  basicSalary: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  allowances: SalaryLineItem[];

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: money })
  bonus: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: money })
  overtime: number;

  // --- Deductions ---
  @Column({ type: 'jsonb', default: () => "'[]'" })
  deductions: SalaryLineItem[];

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0, transformer: money })
  tax: number;

  // --- Totals (computed by the server when the slip is generated) ---
  @Column({
    name: 'total_allowances',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: money,
  })
  totalAllowances: number;

  @Column({ name: 'gross_salary', type: 'numeric', precision: 12, scale: 2, transformer: money })
  grossSalary: number;

  /** Itemised deductions + tax. */
  @Column({
    name: 'total_deductions',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: money,
  })
  totalDeductions: number;

  @Column({ name: 'net_salary', type: 'numeric', precision: 12, scale: 2, transformer: money })
  netSalary: number;

  // --- Payment information ---
  @Column({ name: 'payment_date', type: 'date', nullable: true })
  paymentDate: string | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 40, nullable: true })
  paymentMethod: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 150, nullable: true })
  bankName: string | null;

  @Column({ name: 'bank_account_number', type: 'varchar', length: 60, nullable: true })
  bankAccountNumber: string | null;

  @Column({ name: 'working_days', type: 'int', nullable: true })
  workingDays: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Relative to uploads/, e.g. 'salary-slips/<uuid>.pdf'. Re-rendered if the file goes missing. */
  @Column({ name: 'pdf_path', type: 'varchar', length: 500, nullable: true })
  pdfPath: string | null;

  // --- Email delivery ---
  @Index()
  @Column({
    name: 'email_status',
    type: 'enum',
    enum: SalarySlipEmailStatus,
    default: SalarySlipEmailStatus.NOT_SENT,
  })
  emailStatus: SalarySlipEmailStatus;

  @Column({ name: 'emailed_to', type: 'varchar', length: 255, nullable: true })
  emailedTo: string | null;

  @Column({ name: 'email_sent_at', type: 'timestamptz', nullable: true })
  emailSentAt: Date | null;

  @Column({ name: 'email_error', type: 'text', nullable: true })
  emailError: string | null;

  @Column({ name: 'email_attempts', type: 'int', default: 0 })
  emailAttempts: number;

  @Column({ name: 'last_email_attempt_at', type: 'timestamptz', nullable: true })
  lastEmailAttemptAt: Date | null;

  @Column({ name: 'generated_by_id', type: 'int', nullable: true })
  generatedById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'generated_by_id' })
  generatedBy: User | null;

  /** Set when a newer revision replaces this slip. Null = the current slip for that month. */
  @Column({ name: 'superseded_at', type: 'timestamptz', nullable: true })
  supersededAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
