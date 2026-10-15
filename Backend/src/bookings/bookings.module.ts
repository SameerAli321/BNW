import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingParticipant } from '../entities/booking-participant.entity';
import { BookingResource } from '../entities/booking-resource.entity';
import { User } from '../entities/user.entity';
import { BookingResourcesController, BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

/** Bookings: meetings, meeting rooms and the pool table (+ the rooms & tables HR / Admin manage). */
@Module({
  imports: [TypeOrmModule.forFeature([Booking, BookingParticipant, BookingResource, User])],
  controllers: [BookingsController, BookingResourcesController],
  providers: [BookingsService],
})
export class BookingsModule {}
