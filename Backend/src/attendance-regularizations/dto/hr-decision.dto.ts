import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { AttendanceHrDecision } from '../../common/enums/attendance-regularization.enum';

/** POST /attendance-regularizations/:id/hr-decision — HR / ADMIN. */
export class HrDecisionDto {
  @IsEnum(AttendanceHrDecision)
  decision: AttendanceHrDecision;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  signatureText: string;
}
