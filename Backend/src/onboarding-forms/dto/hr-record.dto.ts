import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** POST /onboarding-forms/:id/hr-record — the paper form's "HRD Use Only" section. HR / ADMIN. */
export class HrRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recordedTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comments?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  signatureText: string;
}
