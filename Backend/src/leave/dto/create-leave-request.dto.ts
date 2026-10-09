import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** POST /leave-requests — the employee's application. */
export class CreateLeaveRequestDto {
  @Type(() => Number)
  @IsInt()
  leaveTypeId: number;

  @Matches(DATE_ONLY_PATTERN, { message: 'startDate must be a date in YYYY-MM-DD format' })
  startDate: string;

  @Matches(DATE_ONLY_PATTERN, { message: 'endDate must be a date in YYYY-MM-DD format' })
  endDate: string;

  // Only allowed for a single-day request.
  @IsOptional()
  @IsBoolean()
  halfDay?: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactDuringLeave?: string;
}
