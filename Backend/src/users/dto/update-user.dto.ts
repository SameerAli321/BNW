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

export class UpdateUserDto extends EmployeeInfoFields {
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

  @IsOptional()
  @IsEnum(RoleName)
  role?: RoleName;

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

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  // HR/ADMIN can directly set a user's password from the edit form, as an alternative to the
  // random-generated /users/:id/reset-password action.
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
