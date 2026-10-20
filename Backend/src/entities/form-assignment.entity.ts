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
import { FormAssignmentStatus, FormAssignmentType } from '../common/enums/form-assignment.enum';
import { User } from './user.entity';

/**
 * "HR sends a form": HR / Admin ask one employee to fill in one of the existing forms (leave,
 * complaint, onboarding…). It shows on the employee's Requests & Forms page under "Forms sent to
 * you" until they mark it done or HR / Admin cancel it. Just a reminder — the form itself is still
 * submitted through its own page.
 */
@Entity('form_assignments')
export class FormAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    name: 'form_type',
    type: 'enum',
    enum: FormAssignmentType,
    enumName: 'form_assignments_form_type_enum',
  })
  formType: FormAssignmentType;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: FormAssignmentStatus,
    enumName: 'form_assignments_status_enum',
    default: FormAssignmentStatus.PENDING,
  })
  status: FormAssignmentStatus;

  @Column({ name: 'assigned_by', type: 'int', nullable: true })
  assignedById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedBy: User | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
