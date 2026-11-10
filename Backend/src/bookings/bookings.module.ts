import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingParticipant } from '../entities/booking-participant.entity';
import { BookingResource } from '../entities/booking-resource.entity';
import { LeaveRequest } from '../entities/leave-request.entity';
import { OffDay } from '../entities/off-day.entity';
import { User } from '../entities/user.entity';
import {
  BookingResourcesController,
  BookingsController,
  OffDaysController,
} from './bookings.controller';
import { BookingsService } from './bookings.service';

/** Bookings: meetings, meeting rooms and the pool table (+ the rooms & tables HR / Admin manage). */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingParticipant,
      BookingResource,
      User,
      LeaveRequest,
      OffDay,
    ]),
  ],
  controllers: [BookingsController, BookingResourcesController, OffDaysController],
  providers: [BookingsService],
})
export class BookingsModule {}
