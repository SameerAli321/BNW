import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LetterTemplateType } from '../common/enums/letter-template-type.enum';

export interface LetterFieldSchemaEntry {
  key: string;
  label: string;
  autoFilled: boolean;
}

/**
 * Sprint 3 letter templates. Per docs/API_CONTRACT_SPRINT3.md scope cut #1: bodyHtml is dummy
 * placeholder content for now (project owner's explicit instruction — "for template create dummy
 * then will update according to data"). Swapping in real template content later is just an update
 * to `bodyHtml`, not a schema change.
 */
@Entity('letter_templates')
export class LetterTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: LetterTemplateType })
  type: LetterTemplateType;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'role_scope', type: 'varchar', length: 150, nullable: true })
  roleScope: string | null;

  @Column({ name: 'body_html', type: 'text' })
  bodyHtml: string;

  @Column({ name: 'fields_schema', type: 'jsonb' })
  fieldsSchema: LetterFieldSchemaEntry[];

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
