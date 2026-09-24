import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Gender } from '../common/enums/gender.enum';
import { User } from './user.entity';

/**
 * Gap-fix (docs/API_CONTRACT_GAPS_FIX.md, Gap 1): one row per user, all fields nullable — the
 * profile is filled in over time, not required at account creation. See
 * docs/BACKEND_STATUS.md's "Gap-fix" section for the endpoints/ownership rules.
 */
@Entity('employee_profiles')
export class EmployeeProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'int', unique: true })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender | null;

  @Column({ name: 'emergency_contact_name', type: 'varchar', length: 150, nullable: true })
  emergencyContactName: string | null;

  @Column({ name: 'emergency_contact_phone', type: 'varchar', length: 30, nullable: true })
  emergencyContactPhone: string | null;

  @Column({ name: 'national_id', type: 'varchar', length: 60, nullable: true })
  nationalId: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 150, nullable: true })
  bankName: string | null;

  @Column({ name: 'bank_account_number', type: 'varchar', length: 60, nullable: true })
  bankAccountNumber: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
