import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimList = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.map((v) => (typeof v === 'string' ? v.trim() : v)).filter((v) => v !== '')
    : value;

export class AboutCompanyDto {
  @Transform(trim)
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(5000)
  about?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  mission?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  vision?: string;

  @IsOptional()
  @Transform(trimList)
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  services?: string[];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @Transform(trimList)
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  phones?: string[];

  @IsOptional()
  @Transform(trim)
  @ValidateIf((_, value) => value !== '')
  @IsEmail({}, { message: 'Enter a valid company email' })
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  website?: string;
}

export class AboutCeoDto {
  /** Leave empty to use the CEO's name from their account. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(8000)
  message?: string;
}

/** PUT /about */
export class UpdateAboutDto {
  @ValidateNested()
  @Type(() => AboutCompanyDto)
  company: AboutCompanyDto;

  @ValidateNested()
  @Type(() => AboutCeoDto)
  ceo: AboutCeoDto;
}
