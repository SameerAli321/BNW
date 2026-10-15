import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, JwtUserPayload } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../common/enums/role.enum';
import { BookingsService } from './bookings.service';
import {
  AvailabilityQueryDto,
  CancelBookingDto,
  CreateBookingDto,
  CreateBookingResourceDto,
  QueryBookingResourcesDto,
  QueryBookingsDto,
  UpcomingMeetingsQueryDto,
  UpdateBookingDto,
  UpdateBookingResourceDto,
} from './dto/booking.dto';

/**
 * Bookings: meetings, meeting rooms and the pool table. Everyone can book rooms / the pool table;
 * meetings are organised by the CEO, HR / Admin and Team Leads (checked in the service, which also
 * enforces who may see and change each booking).
 */
@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  async list(@Query() query: QueryBookingsDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.list(query, caller);
  }

  // Dashboard card — the caller's own upcoming meetings.
  @Get('upcoming-meetings')
  async upcomingMeetings(
    @Query() query: UpcomingMeetingsQueryDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.upcomingMeetings(query.limit ?? 5, caller);
  }

  // Participant picker for meeting organisers.
  @Roles(RoleName.CEO, RoleName.HR, RoleName.ADMIN, RoleName.MANAGER)
  @Get('people')
  async people() {
    return this.service.people();
  }

  // Busy times for the booking form (no meeting details).
  @Get('availability')
  async availability(@Query() query: AvailabilityQueryDto) {
    return this.service.availability(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() caller: JwtUserPayload) {
    return this.service.getOne(id, caller);
  }

  @Post()
  async create(@Body() dto: CreateBookingDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.create(dto, caller);
  }

  // Edit and/or reschedule — the organiser (or whoever booked it; HR / Admin for rooms & tables).
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookingDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.update(id, dto, caller);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelBookingDto,
    @CurrentUser() caller: JwtUserPayload,
  ) {
    return this.service.cancel(id, dto.reason, caller);
  }
}

/** Meeting rooms and pool tables — everyone can list them; HR / Admin manage them. */
@Controller('booking-resources')
export class BookingResourcesController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  async list(@Query() query: QueryBookingResourcesDto, @CurrentUser() caller: JwtUserPayload) {
    return this.service.listResources(query, caller);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Post()
  async create(@Body() dto: CreateBookingResourceDto) {
    return this.service.createResource(dto);
  }

  @Roles(RoleName.HR, RoleName.ADMIN)
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBookingResourceDto) {
    return this.service.updateResource(id, dto);
  }
}
