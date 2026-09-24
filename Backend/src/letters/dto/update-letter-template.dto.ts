import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LetterTemplateType } from '../../common/enums/letter-template-type.enum';
import { LetterFieldSchemaEntryDto } from './create-letter-template.dto';

/**
 * Full update per docs/API_CONTRACT_SPRINT3.md — "creating a new version isn't required this
 * sprint (bump `version` manually if `bodyHtml` changes)". All fields optional so a caller can
 * PUT with only the fields they're changing; unset fields are left as-is by the service.
 */
export class UpdateLetterTemplateDto {
  @IsOptional()
  @IsEnum(LetterTemplateType)
  type?: LetterTemplateType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  roleScope?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  bodyHtml?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LetterFieldSchemaEntryDto)
  fieldsSchema?: LetterFieldSchemaEntryDto[];

  @IsOptional()
  @IsInt()
  version?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
