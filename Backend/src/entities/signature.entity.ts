import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Letter } from './letter.entity';
import { User } from './user.entity';

/**
 * Simple in-app "typed name" signature per docs/API_CONTRACT_SPRINT3.md scope cut #3 — no drawn
 * signature canvas yet. One row on CEO sign, one row on employee sign.
 */
@Entity('signatures')
export class Signature {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'letter_id', type: 'int' })
  letterId: number;

  @ManyToOne(() => Letter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'letter_id' })
  letter: Letter;

  @Column({ name: 'signer_id', type: 'int' })
  signerId: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'signer_id' })
  signer: User | null;

  // Snapshot of the signer's role at signing time (not a live join to users.role).
  @Column({ name: 'signer_role', type: 'varchar', length: 30 })
  signerRole: string;

  @Column({ name: 'signature_text', type: 'varchar', length: 255 })
  signatureText: string;

  @CreateDateColumn({ name: 'signed_at' })
  signedAt: Date;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  // sha256 of the letter's field values + template version at signing time, so a later edit can't
  // silently invalidate an already-signed record.
  @Column({ name: 'document_hash', type: 'varchar', length: 64 })
  documentHash: string;
}
