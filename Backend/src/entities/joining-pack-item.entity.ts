import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JoiningPackItemKind } from '../common/enums/joining-pack-item-kind.enum';

/**
 * Sprint 5 — Hiring (docs/API_CONTRACT_SPRINT5.md). Admin/HR-managed, same simple CRUD shape as
 * `letter_templates` but no versioning — a read-and-acknowledge document, not signed/merged.
 */
@Entity('joining_pack_items')
export class JoiningPackItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: JoiningPackItemKind })
  kind: JoiningPackItemKind;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
