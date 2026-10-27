import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  BookingRepeat,
  BookingResourceType,
  BookingStatus,
  BookingType,
} from '../../common/enums/booking.enum';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Edit / reschedule (PATCH /bookings/:id) — the booking's type can't change. */
export class UpdateBookingDto {
  /**
   * Required for meetings and "Others" (the activity, e.g. "Namaz"); rooms / pool table get a
   * default title when it's left empty.
   */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  purpose?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  /** Day in Pakistan time, 'YYYY-MM-DD'. */
  @Matches(DATE, { message: 'date must be YYYY-MM-DD' })
  date: string;

  /** Start time in Pakistan time, 24h 'HH:mm'. */
  @Matches(TIME, { message: 'time must be HH:mm' })
  time: string;

  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes: number;

  /** Meeting room / pool table. Required for room and pool-table bookings; optional for meetings. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  resourceId?: number | null;

  /** Meetings only — where it happens when no room is booked (e.g. "Online — Teams"). */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  location?: string | null;

  /** Meetings only — invited employees (user IDs). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  participantIds?: number[];
}

/** Repeat a new booking daily / on weekdays / weekly up to and including `until`. */
export class BookingRepeatDto {
  @IsEnum(BookingRepeat, { message: 'Repeat must be daily, weekdays or weekly' })
  frequency: BookingRepeat;

  /** Last day (Pakistan time), 'YYYY-MM-DD'. */
  @Matches(DATE, { message: 'Repeat until must be YYYY-MM-DD' })
  until: string;
}

/** POST /bookings */
export class CreateBookingDto extends UpdateBookingDto {
  @IsEnum(BookingType)
  type: BookingType;

  @IsOptional()
  @ValidateNested()
  @Type(() => BookingRepeatDto)
  repeat?: BookingRepeatDto;
}

export class CancelBookingDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  reason?: string;

  /** For a repeating booking: just this one (default), or this one and every later one. */
  @IsOptional()
  @IsIn(['ONE', 'FOLLOWING'])
  scope?: 'ONE' | 'FOLLOWING';
}

/** GET /bookings — calendar range and list filters. */
export class QueryBookingsDto {
  /** First day (Pakistan time), inclusive. */
  @IsOptional()
  @Matches(DATE)
  from?: string;

  /** Last day (Pakistan time), inclusive. */
  @IsOptional()
  @Matches(DATE)
  to?: string;

  @IsOptional()
  @IsEnum(BookingType)
  type?: BookingType;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  resourceId?: number;

  /** Bookings this employee organises or is invited to (within what the caller may see). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  /** 'mine' = only bookings the caller organised, made, or is invited to. */
  @IsOptional()
  @IsIn(['mine', 'all'])
  scope?: 'mine' | 'all';

  @IsOptional()
  @IsIn(['upcoming', 'past'])
  when?: 'upcoming' | 'past';

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

/** GET /bookings/availability — busy times for one day, without any meeting details. */
export class AvailabilityQueryDto {
  @Matches(DATE, { message: 'date must be YYYY-MM-DD' })
  date: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  resourceId?: number;

  /** Comma-separated user IDs, e.g. "4,9,12". */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((part) => Number(part.trim()))
          .filter((id) => Number.isInteger(id) && id > 0)
      : value,
  )
  @IsArray()
  @ArrayMaxSize(60)
  @IsInt({ each: true })
  userIds?: number[];

  /** When editing: leave this booking's own time out of the busy list. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  excludeBookingId?: number;
}

/** GET /bookings/calendar-leaves — leave overlapping a calendar range (Pakistan days, inclusive). */
export class CalendarLeavesQueryDto {
  @Matches(DATE, { message: 'from must be YYYY-MM-DD' })
  from: string;

  @Matches(DATE, { message: 'to must be YYYY-MM-DD' })
  to: string;

  /** One person's leave (must be in the caller's calendar scope). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}

export class UpcomingMeetingsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number;
}

// ----------------------------------------------------------------------------------------------
// Rooms & tables (HR / Admin)
// ----------------------------------------------------------------------------------------------

export class CreateBookingResourceDto {
  @IsEnum(BookingResourceType)
  type: BookingResourceType;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number | null;
}

export class UpdateBookingResourceDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  capacity?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryBookingResourcesDto {
  @IsOptional()
  @IsEnum(BookingResourceType)
  type?: BookingResourceType;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  includeInactive?: boolean;
}
