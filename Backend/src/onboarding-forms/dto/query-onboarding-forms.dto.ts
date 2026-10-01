import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OnboardingFormStatus } from '../../common/enums/onboarding-form-status.enum';

export class QueryOnboardingFormsDto {
  @IsOptional()
  @IsEnum(OnboardingFormStatus)
  status?: OnboardingFormStatus;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;
}
