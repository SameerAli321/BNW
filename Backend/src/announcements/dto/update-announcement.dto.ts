import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AnnouncementAudience } from '../../common/enums/announcement-audience.enum';
import { Company } from '../../common/enums/company.enum';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** PATCH /announcements/:id — the poster or ADMIN. Partial; doesn't re-send notifications. */
export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body?: string;

  @IsOptional()
  @IsEnum(AnnouncementAudience)
  audience?: AnnouncementAudience;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  departmentIds?: number[];

  // Which company it's for: BNW or HAYES (plus the shared HR / Administration team); null / left
  // out = both companies.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn([Company.BNW, Company.HAYES], { message: 'company must be BNW, HAYES or empty' })
  company?: Company.BNW | Company.HAYES | null;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(DATE_ONLY_PATTERN, { message: 'expiresOn must be a date in YYYY-MM-DD format' })
  expiresOn?: string | null;
}
