import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RoleName } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

export class QueryStaffSummaryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  // Ignored by GET /staff-summary/export (no pagination on export), used by GET /staff-summary.
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
