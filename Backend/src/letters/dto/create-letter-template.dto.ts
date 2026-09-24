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

export class LetterFieldSchemaEntryDto {
  @IsString()
  @MinLength(1)
  key: string;

  @IsString()
  @MinLength(1)
  label: string;

  @IsBoolean()
  autoFilled: boolean;
}

export class CreateLetterTemplateDto {
  @IsEnum(LetterTemplateType)
  type: LetterTemplateType;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  roleScope?: string;

  @IsString()
  @MinLength(1)
  bodyHtml: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LetterFieldSchemaEntryDto)
  fieldsSchema: LetterFieldSchemaEntryDto[];

  @IsOptional()
  @IsInt()
  version?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
