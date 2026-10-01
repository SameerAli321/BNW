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
import { WorkOrderStatus, WorkOrderType } from '../common/enums/work-order.enum';
import { User } from './user.entity';

const money = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

/**
 * Work order (guide §3 "Approval for anything"): a reimbursement claim or an equipment request.
 * Goes employee → line manager → CEO (only above the amount limit) → Payroll (reimbursement) or
 * HR / Admin (equipment), who complete it. Each approver's decision is kept with a typed-name
 * signature, same as the other HR forms.
 */
@Entity('work_orders')
export class WorkOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'employee_id', type: 'int' })
  employeeId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  @Index()
  @Column({ type: 'enum', enum: WorkOrderType })
  type: WorkOrderType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 60 })
  category: string;

  @Column({ type: 'text' })
  description: string;

  /** Reimbursement: amount claimed. Equipment: estimated cost (optional). PKR. */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true, transformer: money })
  amount: number | null;

  /** Reimbursement: the day the money was spent. */
  @Column({ name: 'expense_date', type: 'date', nullable: true })
  expenseDate: string | null;

  /** Equipment: how many. */
  @Column({ type: 'int', nullable: true })
  quantity: number | null;

  /** Equipment: when it's needed by. */
  @Column({ name: 'needed_by', type: 'date', nullable: true })
  neededBy: string | null;

  // Receipt / quotation file (optional), under uploads/work-order-receipts/.
  @Column({ name: 'receipt_path', type: 'varchar', length: 500, nullable: true })
  receiptPath: string | null;

  @Column({ name: 'receipt_original_name', type: 'varchar', length: 255, nullable: true })
  receiptOriginalName: string | null;

  @Column({ name: 'receipt_mime', type: 'varchar', length: 150, nullable: true })
  receiptMime: string | null;

  @Index()
  @Column({ type: 'enum', enum: WorkOrderStatus })
  status: WorkOrderStatus;

  /** Decided when it was submitted: amount over the CEO limit at that time. */
  @Column({ name: 'ceo_required', type: 'boolean', default: false })
  ceoRequired: boolean;

  // --- Line manager ---
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

  @Column({ name: 'manager_signed_at', type: 'timestamptz', nullable: true })
  managerSignedAt: Date | null;

  // --- CEO (only when ceoRequired) ---
  @Column({ name: 'ceo_user_id', type: 'int', nullable: true })
  ceoUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ceo_user_id' })
  ceoUser: User | null;

  @Column({ name: 'ceo_approved', type: 'boolean', nullable: true })
  ceoApproved: boolean | null;

  @Column({ name: 'ceo_remarks', type: 'text', nullable: true })
  ceoRemarks: string | null;

  @Column({ name: 'ceo_signature_text', type: 'varchar', length: 255, nullable: true })
  ceoSignatureText: string | null;

  @Column({ name: 'ceo_signed_at', type: 'timestamptz', nullable: true })
  ceoSignedAt: Date | null;

  // --- Processing: Payroll (reimbursement) / HR or Admin (equipment) ---
  @Column({ name: 'processor_id', type: 'int', nullable: true })
  processorId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'processor_id' })
  processor: User | null;

  @Column({ name: 'processor_approved', type: 'boolean', nullable: true })
  processorApproved: boolean | null;

  @Column({ name: 'processor_remarks', type: 'text', nullable: true })
  processorRemarks: string | null;

  /** Payment reference (reimbursement) or asset tag / serial number (equipment). */
  @Column({ name: 'processor_reference', type: 'varchar', length: 200, nullable: true })
  processorReference: string | null;

  @Column({ name: 'processor_signature_text', type: 'varchar', length: 255, nullable: true })
  processorSignatureText: string | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
