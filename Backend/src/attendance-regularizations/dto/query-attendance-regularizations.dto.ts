import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AttendanceRegularizationStatus } from '../../common/enums/attendance-regularization.enum';

/** Shared by /mine, /team and the HR list; `q` (name search) only applies to /team and the list. */
export class QueryAttendanceRegularizationsDto {
  @IsOptional()
  @IsEnum(AttendanceRegularizationStatus)
  status?: AttendanceRegularizationStatus;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;
}
