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
import { AppraisalStatus } from '../common/enums/appraisal-status.enum';
import { AppraisalManagerDecision } from '../common/enums/appraisal-manager-decision.enum';
import { AppraisalCeoDecision } from '../common/enums/appraisal-ceo-decision.enum';
import { User } from './user.entity';

/**
 * Sprint 4 — employee-initiated quarterly appraisal request. See
 * docs/API_CONTRACT_SPRINT4.md "New tables" and its "Deviation from the original guide" note:
 * this is NOT the guide's HR-scheduled cycle model, it's a simpler employee-initiated flow
 * specified directly by the user.
 */
@Entity('appraisal_requests')
export class AppraisalRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'employee_id', type: 'int' })
  employeeId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  @Column({ name: 'self_evaluation', type: 'text' })
  selfEvaluation: string;

  @Index()
  @Column({ type: 'enum', enum: AppraisalStatus, default: AppraisalStatus.PENDING_MANAGER })
  status: AppraisalStatus;

  // Snapshot of who the employee's manager was AT SUBMISSION TIME, so a later manager
  // reassignment doesn't retroactively change who reviewed a past request. Nullable per the
  // contract's table definition even though POST /appraisal-requests 400s without a managerId at
  // submission time — kept nullable to match the contract literally and to tolerate a manager
  // being deleted (ON DELETE SET NULL) without losing the request row.
  @Index()
  @Column({ name: 'manager_id', type: 'int', nullable: true })
  managerId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: User | null;

  @Column({ name: 'manager_remarks', type: 'text', nullable: true })
  managerRemarks: string | null;

  @Column({ name: 'manager_message', type: 'text', nullable: true })
  managerMessage: string | null;

  @Column({
    name: 'manager_decision',
    type: 'enum',
    enum: AppraisalManagerDecision,
    nullable: true,
  })
  managerDecision: AppraisalManagerDecision | null;

  @Column({ name: 'manager_decided_at', type: 'timestamp', nullable: true })
  managerDecidedAt: Date | null;

  @Column({ name: 'ceo_remarks', type: 'text', nullable: true })
  ceoRemarks: string | null;

  @Column({ name: 'ceo_message', type: 'text', nullable: true })
  ceoMessage: string | null;

  @Column({ name: 'ceo_decision', type: 'enum', enum: AppraisalCeoDecision, nullable: true })
  ceoDecision: AppraisalCeoDecision | null;

  @Column({ name: 'ceo_decided_at', type: 'timestamp', nullable: true })
  ceoDecidedAt: Date | null;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
