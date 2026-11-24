import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * A free-text note written in the "Notes for HR" box on a create form (client decision, Nov 2026).
 * One table for every kind of record: `entity` says which (see internal-notes/note-entities.ts),
 * `entityId` is that record's id. Only HR / Admin can read them.
 */
@Entity('internal_notes')
@Index(['entity', 'entityId'])
export class InternalNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40 })
  entity: string;

  @Column({ name: 'entity_id', type: 'int' })
  entityId: number;

  @Column({ type: 'text' })
  note: string;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
