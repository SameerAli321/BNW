import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const TODAY_STATUSES = ['AVAILABLE', 'ON_LEAVE', 'IN_MEETING', 'INACTIVE'] as const;
export type TodayStatus = (typeof TODAY_STATUSES)[number];

/** GET /dashboard/team-status */
export class QueryTeamStatusDto {
  /** Name, employee code, email or job title. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsIn(TODAY_STATUSES)
  status?: TodayStatus;

  /** Only people with at least one request / form still in progress. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsBoolean()
  hasPending?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
