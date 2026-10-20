import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

/**
 * An employee's signed acknowledgement of the Employee Policy Handbook (About us page). One per
 * person per handbook version — when the handbook changes, its version is bumped and everyone
 * acknowledges the new one. Typed-name signature, same approach as letters.
 */
@Entity('policy_acknowledgements')
@Index(['userId', 'policyVersion'], { unique: true })
export class PolicyAcknowledgement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'policy_version', type: 'varchar', length: 30 })
  policyVersion: string;

  @Column({ name: 'signature_text', type: 'varchar', length: 255 })
  signatureText: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  /** Names of the manager / HR people it was sent to, as shown to the employee afterwards. */
  @Column({ name: 'sent_to', type: 'jsonb', default: () => "'[]'" })
  sentTo: string[];

  @CreateDateColumn({ name: 'acknowledged_at', type: 'timestamptz' })
  acknowledgedAt: Date;
}
