import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus, BookingType } from '../common/enums/booking.enum';
import { BookingResource } from './booking-resource.entity';
import { BookingParticipant } from './booking-participant.entity';
import { User } from './user.entity';

/**
 * One booking: a meeting (organiser + invited employees, optionally in a meeting room), a meeting
 * room, or a pool-table slot. Times are exact instants (shown in Pakistan time). Clashes — the same
 * room/table, or the same person in two meetings — are rejected by BookingsService inside a
 * transaction that locks the room/table and the people involved. `sequence` goes up whenever the
 * time or place changes, so calendar invites update the same event.
 */
@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'enum', enum: BookingType, enumName: 'bookings_type_enum' })
  type: BookingType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  purpose: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ name: 'resource_id', type: 'int', nullable: true })
  resourceId: number | null;

  @ManyToOne(() => BookingResource, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'resource_id' })
  resource: BookingResource | null;

  /** Free-text place for meetings without a room (e.g. "Online — Teams", "Client office"). */
  @Column({ type: 'varchar', length: 300, nullable: true })
  location: string | null;

  @Index()
  @Column({ name: 'start_at', type: 'timestamptz' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz' })
  endAt: Date;

  @Index()
  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'bookings_status_enum',
    default: BookingStatus.CONFIRMED,
  })
  status: BookingStatus;

  @Index()
  @Column({ name: 'organizer_id', type: 'int' })
  organizerId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizer_id' })
  organizer: User;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @Column({ type: 'int', default: 0 })
  sequence: number;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancelled_by_id', type: 'int', nullable: true })
  cancelledById: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cancelled_by_id' })
  cancelledBy: User | null;

  @OneToMany(() => BookingParticipant, (participant) => participant.booking)
  participants: BookingParticipant[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
