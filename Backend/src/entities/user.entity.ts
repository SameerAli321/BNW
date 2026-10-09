import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleName } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { Department } from './department.entity';

const money = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'employee_code', type: 'varchar', length: 30, unique: true, nullable: true })
  employeeCode: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'enum', enum: RoleName })
  role: RoleName;

  @Column({ name: 'manager_id', type: 'int', nullable: true })
  managerId: number | null;

  @ManyToOne(() => User, (user) => user.reports, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id' })
  manager: User | null;

  @OneToMany(() => User, (user) => user.manager)
  reports: User[];

  @Column({ name: 'department_id', type: 'int', nullable: true })
  departmentId: number | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: Department | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  designation: string | null;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ name: 'join_date', type: 'date', nullable: true })
  joinDate: string | null;

  @Column({ name: 'leaving_date', type: 'date', nullable: true })
  leavingDate: string | null;

  // --- Compensation (HR / ADMIN only — never put these in a response for anyone else) ---
  @Column({
    name: 'current_salary',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: money,
  })
  currentSalary: number | null;

  @Column({
    name: 'previous_salary',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: money,
  })
  previousSalary: number | null;

  @Column({ name: 'deduction_policy', type: 'text', nullable: true })
  deductionPolicy: string | null;

  @Column({ name: 'last_salary_change_date', type: 'date', nullable: true })
  lastSalaryChangeDate: string | null;

  // Randomized file name under uploads/avatars/ — null until the user uploads a profile picture.
  @Column({ name: 'avatar_path', type: 'varchar', length: 255, nullable: true })
  avatarPath: string | null;

  /** Opt-in (HR / Admin / CEO): a notification + email whenever anyone submits a request. */
  @Column({ name: 'notify_all_requests', type: 'boolean', default: false })
  notifyAllRequests: boolean;

  @Column({ name: 'must_change_password', type: 'boolean', default: true })
  mustChangePassword: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
