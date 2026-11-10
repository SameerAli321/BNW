import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * A company-wide day off declared by HR / Admin (public holiday, office closure). Nothing can be
 * booked on it — bookings already on it are cancelled when it's declared — and leave doesn't use a
 * day for it, the same as a weekend (client feedback, Nov 2026).
 */
@Entity('off_days')
export class OffDay {
  @PrimaryGeneratedColumn()
  id: number;

  /** YYYY-MM-DD, Pakistan time. One row per date. */
  @Column({ type: 'date', unique: true })
  date: string;

  @Column({ type: 'varchar', length: 200 })
  reason: string;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
