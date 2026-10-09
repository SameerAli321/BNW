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
import {
  AttendanceHrDecision,
  AttendanceRegularizationStatus,
} from '../common/enums/attendance-regularization.enum';
import { User } from './user.entity';

/**
 * Attendance regularization — the digital version of the HRD's paper "Regularization of
 * Attendance Recorded in HRD" form. The employee explains a late arrival / missed punch, their
 * head of department (the employee's manager) recommends it, then HR takes it on record or marks
 * it not in order. Employee code, name, designation and department come from the user record.
 */
@Entity('attendance_regularizations')
export class AttendanceRegularization {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'employee_id', type: 'int' })
  employeeId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee: User;

  // The day being regularized ("Date" at the top of the paper form). 'YYYY-MM-DD'.
  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate: string;

  // 'HH:MM' (24h), as typed — either can be blank (e.g. a missed punch on departure only).
  @Column({ name: 'time_arrival', type: 'varchar', length: 5, nullable: true })
  timeArrival: string | null;

  @Column({ name: 'time_departure', type: 'varchar', length: 5, nullable: true })
  timeDeparture: string | null;

  @Column({ type: 'text' })
  reason: string;

  @Index()
  @Column({
    type: 'enum',
    enum: AttendanceRegularizationStatus,
    default: AttendanceRegularizationStatus.PENDING_HOD,
  })
  status: AttendanceRegularizationStatus;

  // Head of department = the employee's manager at submission time.
  @Index()
  @Column({ name: 'hod_id', type: 'int', nullable: true })
  hodId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hod_id' })
  hod: User | null;

  @Column({ name: 'hod_recommended', type: 'boolean', nullable: true })
  hodRecommended: boolean | null;

  @Column({ name: 'hod_remarks', type: 'text', nullable: true })
  hodRemarks: string | null;

  @Column({ name: 'hod_signature_text', type: 'varchar', length: 255, nullable: true })
  hodSignatureText: string | null;

  @Column({ name: 'hod_signed_at', type: 'timestamp', nullable: true })
  hodSignedAt: Date | null;

  @Column({ name: 'hr_decision', type: 'enum', enum: AttendanceHrDecision, nullable: true })
  hrDecision: AttendanceHrDecision | null;

  @Column({ name: 'hr_remarks', type: 'text', nullable: true })
  hrRemarks: string | null;

  @Column({ name: 'hr_user_id', type: 'int', nullable: true })
  hrUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hr_user_id' })
  hrUser: User | null;

  @Column({ name: 'hr_signature_text', type: 'varchar', length: 255, nullable: true })
  hrSignatureText: string | null;

  @Column({ name: 'hr_signed_at', type: 'timestamp', nullable: true })
  hrSignedAt: Date | null;

  // "Date of Submission" on the paper form.
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
