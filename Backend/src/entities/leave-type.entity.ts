import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A kind of leave (Annual, Casual, Sick, Unpaid…) and its yearly allowance. Guide §8.1
 * `leave_types`. `annualQuota` null = no limit (e.g. unpaid leave). HR / ADMIN edit the quotas —
 * the client hasn't confirmed the leave policy yet (guide §12 B7), so the seeded values are
 * defaults.
 */
@Entity('leave_types')
export class LeaveType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  name: string;

  @Column({
    name: 'annual_quota',
    type: 'numeric',
    precision: 5,
    scale: 1,
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | null) => (value === null ? null : parseFloat(value)),
    },
  })
  annualQuota: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
