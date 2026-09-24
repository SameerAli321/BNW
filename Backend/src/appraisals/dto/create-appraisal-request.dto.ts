import { IsString, MinLength } from 'class-validator';

export class CreateAppraisalRequestDto {
  @IsString()
  @MinLength(1)
  selfEvaluation: string;
}
