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
import { ActivityCategory } from '../common/enums/activity-category.enum';
import { User } from './user.entity';

/**
 * Daily activity log — guide §3.1 U3 / §8.1 `daily_activity_logs`. One row per piece of work an
 * employee logs; several rows per day are expected. See docs/API_CONTRACT_ACTIVITY_LOG.md.
 */
@Entity('daily_activity_logs')
export class DailyActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Plain 'YYYY-MM-DD' — the pg driver returns `date` columns as strings, same as User.joinDate.
  @Index()
  @Column({ name: 'activity_date', type: 'date' })
  activityDate: string;

  @Column({ type: 'enum', enum: ActivityCategory, default: ActivityCategory.CLIENT_WORK })
  category: ActivityCategory;

  // numeric comes back from pg as a string — convert so the entity (and API) always carry a number.
  @Column({
    type: 'numeric',
    precision: 4,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value === null ? null : parseFloat(value)),
    },
  })
  hours: number;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
