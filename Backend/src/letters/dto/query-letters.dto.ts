import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { LetterTemplateType } from '../../common/enums/letter-template-type.enum';
import { LetterStatus } from '../../common/enums/letter-status.enum';

export class QueryLettersDto {
  @IsOptional()
  @IsEnum(LetterTemplateType)
  type?: LetterTemplateType;

  @IsOptional()
  @IsEnum(LetterStatus)
  status?: LetterStatus;

  // HR / CEO / Admin only (ignored for everyone else): one employee's letters, e.g. the E-record.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subjectUserId?: number;

  // HR / CEO / Admin only: letters prepared for a hiring candidate (including ones since moved to
  // the candidate's new account).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  candidateId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
