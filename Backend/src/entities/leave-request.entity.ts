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
import { LeaveRequestStatus } from '../common/enums/leave-request-status.enum';
import { LeaveType } from './leave-type.entity';
import { User } from './user.entity';

const numericTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

/**
 * Leave / holiday application — guide §3.4 R1/R2, §8.1 `leave_requests`. Same flow as the
 * attendance regularization form: the employee applies, their manager approves (or it goes
 * straight to HR if they have no manager), then HR gives final approval. Approved requests make up
 * the employee's holiday record and count against their yearly balance for that leave type.
 */
@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'employee_id', type: 'int' })
  employeeId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  @Column({ name: 'leave_type_id', type: 'int' })
  leaveTypeId: number;

  @ManyToOne(() => LeaveType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'leave_type_id' })
  leaveType: LeaveType;

  // 'YYYY-MM-DD', inclusive.
  @Index()
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'half_day', type: 'boolean', default: false })
  halfDay: boolean;

  // Working days (Mon–Fri) in the range, or 0.5 for a half day — computed server-side.
  @Column({ type: 'numeric', precision: 5, scale: 1, transformer: numericTransformer })
  days: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'contact_during_leave', type: 'varchar', length: 100, nullable: true })
  contactDuringLeave: string | null;

  @Index()
  @Column({ type: 'enum', enum: LeaveRequestStatus, default: LeaveRequestStatus.PENDING_MANAGER })
  status: LeaveRequestStatus;

  // The employee's manager at application time.
  @Index()
  @Column({ name: 'manager_id', type: 'int', nullable: true })
  managerId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: User | null;

  @Column({ name: 'manager_approved', type: 'boolean', nullable: true })
  managerApproved: boolean | null;

  @Column({ name: 'manager_remarks', type: 'text', nullable: true })
  managerRemarks: string | null;

  @Column({ name: 'manager_signature_text', type: 'varchar', length: 255, nullable: true })
  managerSignatureText: string | null;

  @Column({ name: 'manager_signed_at', type: 'timestamp', nullable: true })
  managerSignedAt: Date | null;

  @Column({ name: 'hr_approved', type: 'boolean', nullable: true })
  hrApproved: boolean | null;

  @Column({ name: 'hr_remarks', type: 'text', nullable: true })
  hrRemarks: string | null;

  @Column({ name: 'hr_user_id', type: 'int', nullable: true })
  hrUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hr_user_id' })
  hrUser: User | null;

  @Column({ name: 'hr_signature_text', type: 'varchar', length: 255, nullable: true })
  hrSignatureText: string | null;

  @Column({ name: 'hr_signed_at', type: 'timestamp', nullable: true })
  hrSignedAt: Date | null;

  // --- Cancellation of approved leave (history kept; the original decisions above are untouched) ---
  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({ name: 'cancellation_requested_at', type: 'timestamp', nullable: true })
  cancellationRequestedAt: Date | null;

  /** null = not decided yet (or never requested). */
  @Column({ name: 'cancellation_approved', type: 'boolean', nullable: true })
  cancellationApproved: boolean | null;

  @Column({ name: 'cancellation_remarks', type: 'text', nullable: true })
  cancellationRemarks: string | null;

  @Column({ name: 'cancellation_decided_by_id', type: 'int', nullable: true })
  cancellationDecidedById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cancellation_decided_by_id' })
  cancellationDecidedBy: User | null;

  @Column({ name: 'cancellation_decided_at', type: 'timestamp', nullable: true })
  cancellationDecidedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
