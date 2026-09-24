import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { Gender } from '../../common/enums/gender.enum';

/**
 * PATCH /users/:id/profile body. All fields optional — partial update semantics, same as
 * LetterTemplate's PUT (unset fields are left as-is by the service). Upserts on first write.
 */
export class UpdateEmployeeProfileDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;
}
