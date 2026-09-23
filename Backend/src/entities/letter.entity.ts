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
import { LetterTemplateType } from '../common/enums/letter-template-type.enum';
import { LetterStatus } from '../common/enums/letter-status.enum';
import { LetterTemplate } from './letter-template.entity';
import { User } from './user.entity';

@Entity('letters')
export class Letter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id', type: 'int' })
  templateId: number;

  @ManyToOne(() => LetterTemplate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_id' })
  template: LetterTemplate;

  // Denormalized copy of the template's type at creation time, so it survives later template
  // edits — per docs/API_CONTRACT_SPRINT3.md "New tables".
  @Column({ type: 'enum', enum: LetterTemplateType })
  type: LetterTemplateType;

  @Index()
  @Column({ name: 'subject_user_id', type: 'int' })
  subjectUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_user_id' })
  subjectUser: User;

  @Column({ name: 'prepared_by', type: 'int' })
  preparedBy: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'prepared_by' })
  preparedByUser: User | null;

  @Column({ name: 'field_values', type: 'jsonb', default: {} })
  fieldValues: Record<string, string>;

  @Column({ name: 'pdf_path', type: 'varchar', length: 500, nullable: true })
  pdfPath: string | null;

  @Index()
  @Column({ type: 'enum', enum: LetterStatus, default: LetterStatus.DRAFT })
  status: LetterStatus;

  @Column({ name: 'current_version', type: 'int', default: 1 })
  currentVersion: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
