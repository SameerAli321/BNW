import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { LetterTemplateType } from '../../common/enums/letter-template-type.enum';

export class QueryLetterTemplatesDto {
  @IsOptional()
  @IsEnum(LetterTemplateType)
  type?: LetterTemplateType;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
