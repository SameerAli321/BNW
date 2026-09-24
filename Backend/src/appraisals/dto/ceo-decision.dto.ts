import { IsEnum, IsString, MinLength } from 'class-validator';
import { AppraisalCeoDecision } from '../../common/enums/appraisal-ceo-decision.enum';

export class CeoDecisionDto {
  @IsString()
  @MinLength(1)
  remarks: string;

  @IsString()
  @MinLength(1)
  message: string;

  @IsEnum(AppraisalCeoDecision)
  decision: AppraisalCeoDecision;
}
