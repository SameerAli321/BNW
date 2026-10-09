import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { AppraisalRating } from '../../common/enums/appraisal-rating.enum';
import { SELF_EVALUATION_COMPETENCIES, SelfEvaluationCompetency } from '../self-evaluation-form';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Every field on the form is required (marked * on the original), so no @IsOptional anywhere.

class EmployeeDetailsDto {
  @IsString() @MinLength(1) @MaxLength(150) location: string;
  @IsString() @MinLength(1) @MaxLength(2000) projectDescription: string;
  @IsString() @MinLength(1) @MaxLength(150) name: string;
  @IsString() @MinLength(1) @MaxLength(150) jobTitle: string;
  @IsString() @MinLength(1) @MaxLength(50) contactNumber: string;
  @IsString() @MinLength(1) @MaxLength(255) email: string;
  @IsString() @MinLength(1) @MaxLength(150) department: string;
}

class LineManagerDetailsDto {
  @IsString() @MinLength(1) @MaxLength(150) name: string;
  @IsString() @MinLength(1) @MaxLength(150) designation: string;
}

class AppraisalDurationDto {
  @IsString() @MinLength(1) @MaxLength(20) appraisalYear: string;

  @Matches(DATE_ONLY, { message: 'evaluationFrom must be a date in YYYY-MM-DD format' })
  evaluationFrom: string;

  @Matches(DATE_ONLY, { message: 'evaluationTo must be a date in YYYY-MM-DD format' })
  evaluationTo: string;
}

class CompetencyAssessmentDto {
  @IsIn(SELF_EVALUATION_COMPETENCIES as unknown as string[])
  competency: SelfEvaluationCompetency;

  @IsEnum(AppraisalRating)
  rating: AppraisalRating;

  @IsString() @MinLength(1) @MaxLength(2000) reason: string;
}

class SelfEvaluationFormDto {
  @ValidateNested() @Type(() => EmployeeDetailsDto) employee: EmployeeDetailsDto;
  @ValidateNested() @Type(() => LineManagerDetailsDto) lineManager: LineManagerDetailsDto;
  @ValidateNested() @Type(() => AppraisalDurationDto) duration: AppraisalDurationDto;

  // Exactly one per competency — duplicates/missing ones are checked in the service.
  @IsArray()
  @ArrayMinSize(SELF_EVALUATION_COMPETENCIES.length)
  @ArrayMaxSize(SELF_EVALUATION_COMPETENCIES.length)
  @ValidateNested({ each: true })
  @Type(() => CompetencyAssessmentDto)
  assessments: CompetencyAssessmentDto[];

  @IsString() @MinLength(1) @MaxLength(5000) summaryRemarks: string;
}

/** POST /appraisal-requests — the full Self Evaluation Form. */
export class CreateAppraisalRequestDto {
  @ValidateNested()
  @Type(() => SelfEvaluationFormDto)
  form: SelfEvaluationFormDto;
}
