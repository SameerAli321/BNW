import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** POST /attendance-regularizations/:id/hod-recommendation — the employee's manager only. */
export class HodRecommendationDto {
  @IsBoolean()
  recommended: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;

  // Typed-name signature, same approach as letter signatures.
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  signatureText: string;
}
