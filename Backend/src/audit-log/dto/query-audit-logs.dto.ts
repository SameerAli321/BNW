import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class QueryAuditLogsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  actorId?: number;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  action?: string;

  /** Inclusive start day (Pakistan time), YYYY-MM-DD. */
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'from must be a date in YYYY-MM-DD format' })
  from?: string;

  /** Inclusive end day (Pakistan time), YYYY-MM-DD — runs to the end of that day. */
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'to must be a date in YYYY-MM-DD format' })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
