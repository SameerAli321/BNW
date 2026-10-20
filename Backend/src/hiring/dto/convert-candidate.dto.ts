import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleName } from '../../common/enums/role.enum';
import { EmploymentType } from '../../common/enums/employment-type.enum';

/**
 * Body for POST /candidates/:id/convert — same shape as CreateUserDto (including the mandatory
 * min-8-char password, per API_CONTRACT_SPRINT5.md) minus email/firstName/lastName, which default
 * from the candidate row and can optionally be overridden here.
 */
export class ConvertCandidateDto {
  @IsEnum(RoleName)
  role: RoleName;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsInt()
  managerId?: number;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsDateString()
  joinDate?: string;

  @IsOptional()
  @IsString()
  employeeCode?: string;

  /** Defaults to PERMANENT — pick INTERN when converting an intern. */
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
