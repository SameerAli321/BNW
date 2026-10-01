import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { AnnouncementAudience } from '../../common/enums/announcement-audience.enum';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** POST /announcements — CEO / ADMIN / HR. */
export class CreateAnnouncementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body: string;

  @IsOptional()
  @IsEnum(AnnouncementAudience)
  audience?: AnnouncementAudience;

  // Required when audience = DEPARTMENT.
  @ValidateIf((dto: CreateAnnouncementDto) => dto.audience === AnnouncementAudience.DEPARTMENT)
  @Type(() => Number)
  @IsInt()
  departmentId?: number | null;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  // Last day it shows on dashboards; null/omitted = until removed.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(DATE_ONLY_PATTERN, { message: 'expiresOn must be a date in YYYY-MM-DD format' })
  expiresOn?: string | null;
}
