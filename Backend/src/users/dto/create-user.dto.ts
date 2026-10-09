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
import { UserStatus } from '../../common/enums/user-status.enum';
import { EmployeeInfoFields } from './employee-info.validators';

export class CreateUserDto extends EmployeeInfoFields {
  /** Defaults to ACTIVE. */
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsEmail()
  email: string;

  @IsEnum(RoleName)
  role: RoleName;

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

  // Required: HR/ADMIN set the new user's exact password at creation time.
  @IsString()
  @MinLength(8)
  password: string;
}
