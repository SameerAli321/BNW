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
