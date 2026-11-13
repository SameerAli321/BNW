import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RoleName } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { EmploymentType } from '../../common/enums/employment-type.enum';

export class QueryUsersDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  // Column the Users table is sorted by (the frontend's head-cell id). Unknown values fall back to
  // newest-first, so the empty action column can't break the query.
  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

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
