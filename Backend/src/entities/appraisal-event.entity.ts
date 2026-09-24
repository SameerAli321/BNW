import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AppraisalEventAction } from '../common/enums/appraisal-event-action.enum';
import { AppraisalRequest } from './appraisal-request.entity';
import { User } from './user.entity';

/**
 * Append-only audit trail, one row per appraisal-request transition — same pattern as
 * `letter_events`. Per docs/API_CONTRACT_SPRINT4.md "New tables". Preserves history (e.g. the
 * manager's remarks/message from a prior pass) even after a CEO SEND_BACK clears the live
 * `manager_remarks`/`manager_message`/`manager_decision`/`manager_decided_at` columns on the
 * parent `appraisal_requests` row.
 */
@Entity('appraisal_events')
export class AppraisalEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'appraisal_request_id', type: 'int' })
  appraisalRequestId: number;

  @ManyToOne(() => AppraisalRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appraisal_request_id' })
  appraisalRequest: AppraisalRequest;

  @Column({ name: 'actor_id', type: 'int' })
  actorId: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'enum', enum: AppraisalEventAction })
  action: AppraisalEventAction;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
