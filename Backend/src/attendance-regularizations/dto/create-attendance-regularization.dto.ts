import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** POST /attendance-regularizations — the employee's part of the form. */
export class CreateAttendanceRegularizationDto {
  @Matches(DATE_ONLY_PATTERN, { message: 'attendanceDate must be a date in YYYY-MM-DD format' })
  attendanceDate: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'timeArrival must be a time in HH:MM format' })
  timeArrival?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'timeDeparture must be a time in HH:MM format' })
  timeDeparture?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason: string;
}
