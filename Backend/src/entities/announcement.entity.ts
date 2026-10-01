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
import { AnnouncementAudience } from '../common/enums/announcement-audience.enum';
import { Department } from './department.entity';
import { User } from './user.entity';

/**
 * Announcement board — guide §3.4 R4, §5.6, §8.1 `announcements`. Posted by the CEO, an ADMIN or
 * HR; shown on every dashboard to everyone (or one department) until it expires or is removed.
 */
@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'posted_by', type: 'int', nullable: true })
  postedBy: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'posted_by' })
  poster: User | null;

  @Column({ type: 'enum', enum: AnnouncementAudience, default: AnnouncementAudience.ALL })
  audience: AnnouncementAudience;

  @Column({ name: 'department_id', type: 'int', nullable: true })
  departmentId: number | null;

  @ManyToOne(() => Department, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  @Column({ type: 'boolean', default: false })
  pinned: boolean;

  // Last day it shows; null = until removed. 'YYYY-MM-DD'.
  @Index()
  @Column({ name: 'expires_on', type: 'date', nullable: true })
  expiresOn: string | null;

  @Column({ name: 'email_sent_at', type: 'timestamp', nullable: true })
  emailSentAt: Date | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
