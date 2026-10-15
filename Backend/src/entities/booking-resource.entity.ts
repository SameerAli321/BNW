import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingResourceType } from '../common/enums/booking.enum';

/**
 * A meeting room or pool table that can be booked. HR / Admin add, rename and deactivate them
 * (deactivated ones can't take new bookings but keep their history). Names are unique per type.
 */
@Entity('booking_resources')
export class BookingResource {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'enum', enum: BookingResourceType, enumName: 'booking_resources_type_enum' })
  type: BookingResourceType;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string | null;

  /** Seats (meeting rooms); null when not relevant. */
  @Column({ type: 'int', nullable: true })
  capacity: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
