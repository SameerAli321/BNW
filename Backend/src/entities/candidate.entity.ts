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
import { CandidateStatus } from '../common/enums/candidate-status.enum';
import { User } from './user.entity';

/**
 * Sprint 5 — Hiring (docs/API_CONTRACT_SPRINT5.md). One row per bulk-uploaded CV. No separate
 * `cv_batches` table per the contract — "bulk upload" just means one POST creates N rows.
 */
@Entity('candidates')
export class Candidate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ name: 'cv_file_path', type: 'varchar', length: 500 })
  cvFilePath: string;

  @Column({ name: 'cv_original_name', type: 'varchar', length: 255 })
  cvOriginalName: string;

  @Column({ name: 'cv_mime', type: 'varchar', length: 150 })
  cvMime: string;

  @Column({ name: 'cv_size', type: 'int' })
  cvSize: number;

  @Index()
  @Column({ type: 'enum', enum: CandidateStatus, default: CandidateStatus.NEW })
  status: CandidateStatus;

  @Column({ name: 'converted_user_id', type: 'int', nullable: true })
  convertedUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'converted_user_id' })
  convertedUser: User | null;

  @Column({ name: 'uploaded_by', type: 'int' })
  uploadedBy: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedByUser: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
