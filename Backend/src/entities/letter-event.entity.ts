import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LetterEventAction } from '../common/enums/letter-event-action.enum';
import { Letter } from './letter.entity';
import { User } from './user.entity';

/**
 * Append-only audit trail, one row per letter status transition — the frontend's letter detail
 * page renders this as a timeline. Per docs/API_CONTRACT_SPRINT3.md "New tables".
 */
@Entity('letter_events')
export class LetterEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'letter_id', type: 'int' })
  letterId: number;

  @ManyToOne(() => Letter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'letter_id' })
  letter: Letter;

  @Column({ name: 'actor_id', type: 'int' })
  actorId: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'enum', enum: LetterEventAction })
  action: LetterEventAction;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
