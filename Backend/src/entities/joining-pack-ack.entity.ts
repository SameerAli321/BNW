import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { JoiningPackItem } from './joining-pack-item.entity';

/**
 * Sprint 5 — Hiring (docs/API_CONTRACT_SPRINT5.md). Unique on (userId, itemId) — acknowledging
 * twice no-ops (idempotent, same pattern as letter_events/appraisal_events idempotency elsewhere).
 */
@Entity('joining_pack_acks')
@Unique('UQ_joining_pack_acks_user_item', ['userId', 'itemId'])
export class JoiningPackAck {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'item_id', type: 'int' })
  itemId: number;

  @ManyToOne(() => JoiningPackItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: JoiningPackItem;

  @CreateDateColumn({ name: 'acknowledged_at' })
  acknowledgedAt: Date;
}
