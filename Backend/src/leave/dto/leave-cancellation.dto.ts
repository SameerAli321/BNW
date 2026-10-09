import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** POST /leave-requests/:id/request-cancellation — the employee, for approved leave. */
export class RequestLeaveCancellationDto {
  @IsString()
  @MinLength(3, { message: 'Please give a short reason' })
  @MaxLength(2000)
  reason: string;
}

/** POST /leave-requests/:id/cancellation-decision — HR / ADMIN. */
export class LeaveCancellationDecisionDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;
}
