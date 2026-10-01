import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * POST /complaints. Every section is optional on its own, but the service requires at least one
 * of complaint details / office accessories / maintenance issue to be filled in.
 */
export class CreateComplaintDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  accessoryType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  accessoryDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  accessoryIssue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  maintenanceArea?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  maintenanceDescription?: string;
}
