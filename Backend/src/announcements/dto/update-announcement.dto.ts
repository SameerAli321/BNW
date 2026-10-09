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
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  departmentId?: number | null;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(DATE_ONLY_PATTERN, { message: 'expiresOn must be a date in YYYY-MM-DD format' })
  expiresOn?: string | null;
}
