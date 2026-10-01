import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { ActivityCategory } from '../../common/enums/activity-category.enum';
import { RoleName } from '../../common/enums/role.enum';
import { DATE_ONLY_PATTERN } from './create-activity-log.dto';

/**
 * Shared by GET /activity-logs/mine, /team and /activity-logs. `q` (name search), `role` and
 * `departmentId` only make sense on the multi-person views and are ignored by /mine.
 */
export class QueryActivityLogsDto {
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'from must be a date in YYYY-MM-DD format' })
  from?: string;

  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'to must be a date in YYYY-MM-DD format' })
  to?: string;

  @IsOptional()
  @IsEnum(ActivityCategory)
  category?: ActivityCategory;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

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
