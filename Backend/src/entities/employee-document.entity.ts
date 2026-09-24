import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DocumentSource } from '../common/enums/document-source.enum';
import { User } from './user.entity';
import { DocumentType } from './document-type.entity';

@Entity('employee_documents')
export class EmployeeDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'document_type_id', type: 'int' })
  documentTypeId: number;

  @ManyToOne(() => DocumentType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'document_type_id' })
  documentType: DocumentType;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 150 })
  mime: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ type: 'enum', enum: DocumentSource, default: DocumentSource.UPLOAD })
  source: DocumentSource;

  @Column({ name: 'uploaded_by', type: 'int' })
  uploadedBy: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedByUser: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
