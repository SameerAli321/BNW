import { IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { DATE_ONLY_PATTERN, TIME_PATTERN } from './create-attendance-regularization.dto';

/**
 * PATCH /attendance-regularizations/:id — the employee (or HR / Admin) edits it until the HOD
 * recommends it. Same fields as the create DTO, all optional; anything left out keeps its value.
 * Send '' for a time to clear it.
 */
export class UpdateAttendanceRegularizationDto {
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'attendanceDate must be a date in YYYY-MM-DD format' })
  attendanceDate?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Matches(TIME_PATTERN, { message: 'timeArrival must be a time in HH:MM format' })
  timeArrival?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Matches(TIME_PATTERN, { message: 'timeDeparture must be a time in HH:MM format' })
  timeDeparture?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason?: string;
}
