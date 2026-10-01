import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** POST /leave-requests/:id/manager-decision and /hr-decision. */
export class LeaveDecisionDto {
  @IsBoolean()
  approved: boolean;

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
