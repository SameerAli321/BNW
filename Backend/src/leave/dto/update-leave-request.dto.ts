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

/**
 * PATCH /leave-requests/:id — the employee (or HR / Admin) edits a request nobody has acted on
 * yet. Same fields as CreateLeaveRequestDto, all optional; anything left out keeps its value.
 */
export class UpdateLeaveRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  leaveTypeId?: number;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'startDate must be a date in YYYY-MM-DD format' })
  startDate?: string;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'endDate must be a date in YYYY-MM-DD format' })
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  halfDay?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason?: string;

  // Send '' to clear it.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactDuringLeave?: string;
}
