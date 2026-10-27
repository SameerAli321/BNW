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
import { EmployeeLoanStatus } from '../common/enums/salary-slip.enum';
import { User } from './user.entity';

const money = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

/**
 * A loan to an employee, repaid in `instalments` equal monthly deductions starting `startMonth`.
 * What has been recovered is read from the current salary slips that carry this loan's id, so a
 * regenerated slip never counts an instalment twice. One active loan per employee at a time.
 */
@Entity('employee_loans')
export class EmployeeLoan {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'employee_id', type: 'int' })
  employeeId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: money })
  principal: number;

  /** Number of months to repay over. */
  @Column({ type: 'int' })
  instalments: number;

  /** 'YYYY-MM' — the first month's salary the instalment comes out of. */
  @Column({ name: 'start_month', type: 'varchar', length: 7 })
  startMonth: string;

  @Column({ type: 'enum', enum: EmployeeLoanStatus, default: EmployeeLoanStatus.ACTIVE })
  status: EmployeeLoanStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
