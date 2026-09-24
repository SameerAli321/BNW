import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Gap-fix (docs/API_CONTRACT_GAPS_FIX.md, Gap 2): append-only audit trail. No update/delete
 * endpoint — rows are written by AuditLogService.log() (fire-and-forget) from the 4 call sites
 * the gap-fix doc names explicitly (login success/failure, letter status transitions, signature
 * creation, document download). See docs/BACKEND_STATUS.md's "Gap-fix" section for the full list
 * and the explicit note that broader coverage is future work, not required now.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'actor_id', type: 'int', nullable: true })
  actorId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'varchar', length: 60 })
  action: string;

  @Index()
  @Column({ type: 'varchar', length: 60 })
  entity: string;

  @Column({ name: 'entity_id', type: 'int', nullable: true })
  entityId: number | null;

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
