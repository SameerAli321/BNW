import { IsEnum, IsString, MinLength } from 'class-validator';
import { AppraisalManagerDecision } from '../../common/enums/appraisal-manager-decision.enum';

export class ManagerDecisionDto {
  @IsString()
  @MinLength(1)
  remarks: string;

  @IsString()
  @MinLength(1)
  message: string;

  @IsEnum(AppraisalManagerDecision)
  decision: AppraisalManagerDecision;
}
