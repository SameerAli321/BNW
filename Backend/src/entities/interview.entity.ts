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
  InterviewEmailStatus,
  InterviewMode,
  InterviewStatus,
} from '../common/enums/interview.enum';
import { Candidate } from './candidate.entity';
import { User } from './user.entity';

/**
 * An interview with a candidate. HR schedules it from the candidates list; the candidate (and the
 * chosen interviewers) are emailed an invitation with a calendar invite. Rescheduling/cancelling
 * re-emails everyone and bumps `sequence` so calendars update the same event.
 */
@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'candidate_id', type: 'int' })
  candidateId: number;

  @ManyToOne(() => Candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate: Candidate;

  @Index()
  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ name: 'duration_minutes', type: 'int', default: 30 })
  durationMinutes: number;

  @Column({ type: 'enum', enum: InterviewMode, default: InterviewMode.ONLINE })
  mode: InterviewMode;

  @Column({ name: 'meeting_link', type: 'varchar', length: 500, nullable: true })
  meetingLink: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  location: string | null;

  /** BNW staff taking the interview — they get the invite too. */
  @Column({ name: 'interviewer_ids', type: 'int', array: true, default: () => "'{}'" })
  interviewerIds: number[];

  /** Optional note from HR, included in the candidate's email. */
  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Index()
  @Column({ type: 'enum', enum: InterviewStatus, default: InterviewStatus.SCHEDULED })
  status: InterviewStatus;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;

  /** Calendar-invite revision — bumped on every reschedule / cancel. */
  @Column({ type: 'int', default: 0 })
  sequence: number;

  @Column({
    name: 'email_status',
    type: 'enum',
    enum: InterviewEmailStatus,
    nullable: true,
  })
  emailStatus: InterviewEmailStatus | null;

  @Column({ name: 'email_error', type: 'text', nullable: true })
  emailError: string | null;

  @Column({ name: 'email_sent_at', type: 'timestamptz', nullable: true })
  emailSentAt: Date | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
