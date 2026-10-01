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
import { ComplaintStatus } from '../common/enums/complaint-status.enum';
import { User } from './user.entity';

/**
 * Complaint form — the digital version of BNW's paper "Complaint Form" that any staff member
 * submits to the HR department. Sections mirror the paper form: employee information (name,
 * department and email come from the complainant's user record; only the contact number is typed),
 * complaint details, office accessories, maintenance issue, and the "Human Resource Department
 * Only" section HR fills in afterwards.
 */
@Entity('complaints')
export class Complaint {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'complainant_id', type: 'int' })
  complainantId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'complainant_id' })
  complainant: User;

  @Column({ name: 'contact_number', type: 'varchar', length: 30, nullable: true })
  contactNumber: string | null;

  // Complaint details
  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Office accessories
  @Column({ name: 'accessory_type', type: 'varchar', length: 150, nullable: true })
  accessoryType: string | null;

  @Column({ name: 'accessory_description', type: 'text', nullable: true })
  accessoryDescription: string | null;

  @Column({ name: 'accessory_issue', type: 'text', nullable: true })
  accessoryIssue: string | null;

  // Maintenance issue
  @Column({ name: 'maintenance_area', type: 'varchar', length: 150, nullable: true })
  maintenanceArea: string | null;

  @Column({ name: 'maintenance_description', type: 'text', nullable: true })
  maintenanceDescription: string | null;

  @Index()
  @Column({ type: 'enum', enum: ComplaintStatus, default: ComplaintStatus.SUBMITTED })
  status: ComplaintStatus;

  // Human Resource Department only
  @Column({ name: 'hr_comments', type: 'text', nullable: true })
  hrComments: string | null;

  @Column({ name: 'hr_action_requested', type: 'text', nullable: true })
  hrActionRequested: string | null;

  @Column({ name: 'hr_acknowledgement', type: 'text', nullable: true })
  hrAcknowledgement: string | null;

  // Typed-name signature, same approach as letter signatures.
  @Column({ name: 'hr_signature_text', type: 'varchar', length: 255, nullable: true })
  hrSignatureText: string | null;

  @Column({ name: 'hr_representative_id', type: 'int', nullable: true })
  hrRepresentativeId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hr_representative_id' })
  hrRepresentative: User | null;

  @Column({ name: 'hr_signed_at', type: 'timestamp', nullable: true })
  hrSignedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
