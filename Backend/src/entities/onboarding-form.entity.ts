import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OnboardingFormStatus } from '../common/enums/onboarding-form-status.enum';
import { User } from './user.entity';

/**
 * Employee onboarding form — the digital version of BNW's paper "Employee Onboarding Form". One
 * per user. Full name, email, job title and date of joining come from the user record; the rest is
 * typed by the employee, and on submit the overlapping fields (phone, address, date of birth,
 * CNIC, emergency contact, bank) are copied into their E-record profile. HR then fills the "HRD
 * Use Only" section, which files a PDF copy into the employee's E-record documents.
 */
@Entity('onboarding_forms')
export class OnboardingForm {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'int', unique: true })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Personal information
  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: string | null;

  // "Social Security Number (if applicable)" — the CNIC in practice.
  @Column({ name: 'national_id', type: 'varchar', length: 60, nullable: true })
  nationalId: string | null;

  @Column({ name: 'street_address', type: 'varchar', length: 255, nullable: true })
  streetAddress: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string | null;

  @Column({ name: 'zip_code', type: 'varchar', length: 20, nullable: true })
  zipCode: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  // Employment information
  @Column({ name: 'reason_for_leaving', type: 'text', nullable: true })
  reasonForLeaving: string | null;

  @Column({ name: 'work_responsibilities', type: 'text', nullable: true })
  workResponsibilities: string | null;

  // Emergency contact information
  @Column({ name: 'emergency_contact_name', type: 'varchar', length: 150, nullable: true })
  emergencyContactName: string | null;

  @Column({ name: 'emergency_contact_relationship', type: 'varchar', length: 60, nullable: true })
  emergencyContactRelationship: string | null;

  @Column({ name: 'emergency_contact_phone', type: 'varchar', length: 30, nullable: true })
  emergencyContactPhone: string | null;

  @Column({ name: 'emergency_contact_address', type: 'text', nullable: true })
  emergencyContactAddress: string | null;

  // Bank details
  @Column({ name: 'bank_name', type: 'varchar', length: 150, nullable: true })
  bankName: string | null;

  @Column({ name: 'account_title', type: 'varchar', length: 150, nullable: true })
  accountTitle: string | null;

  @Column({ name: 'account_number', type: 'varchar', length: 60, nullable: true })
  accountNumber: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  iban: string | null;

  // Medical information
  @Column({ name: 'medical_condition', type: 'text', nullable: true })
  medicalCondition: string | null;

  // Acknowledgment — typed-name signature, same approach as letter signatures.
  @Column({ name: 'employee_signature_text', type: 'varchar', length: 255 })
  employeeSignatureText: string;

  @Column({ name: 'employee_signed_at', type: 'timestamp' })
  employeeSignedAt: Date;

  @Index()
  @Column({ type: 'enum', enum: OnboardingFormStatus, default: OnboardingFormStatus.SUBMITTED })
  status: OnboardingFormStatus;

  // HRD use only
  @Column({ name: 'hr_recorded_to', type: 'varchar', length: 255, nullable: true })
  hrRecordedTo: string | null;

  @Column({ name: 'hr_comments', type: 'text', nullable: true })
  hrComments: string | null;

  @Column({ name: 'hr_user_id', type: 'int', nullable: true })
  hrUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hr_user_id' })
  hrUser: User | null;

  @Column({ name: 'hr_signature_text', type: 'varchar', length: 255, nullable: true })
  hrSignatureText: string | null;

  @Column({ name: 'hr_signed_at', type: 'timestamp', nullable: true })
  hrSignedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
