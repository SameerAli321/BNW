import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ParticipantResponse } from '../common/enums/booking.enum';
import { Booking } from './booking.entity';
import { User } from './user.entity';

/** An employee invited to a meeting (the organiser isn't listed here — see Booking.organizerId). */
@Entity('booking_participants')
@Unique('UQ_booking_participants_booking_user', ['bookingId', 'userId'])
export class BookingParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'booking_id', type: 'int' })
  bookingId: number;

  @ManyToOne(() => Booking, (booking) => booking.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Index()
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** The invitee's answer. New invites (and invites after a time change) start as PENDING. */
  @Column({
    type: 'enum',
    enum: ParticipantResponse,
    enumName: 'booking_participants_response_enum',
    default: ParticipantResponse.PENDING,
  })
  response: ParticipantResponse;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  @Column({ name: 'decline_reason', type: 'varchar', length: 300, nullable: true })
  declineReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
