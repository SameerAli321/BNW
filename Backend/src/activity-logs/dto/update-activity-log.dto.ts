import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ActivityCategory } from '../../common/enums/activity-category.enum';
import { DATE_ONLY_PATTERN } from './create-activity-log.dto';

export class UpdateActivityLogDto {
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'activityDate must be a date in YYYY-MM-DD format' })
  activityDate?: string;

  @IsOptional()
  @IsEnum(ActivityCategory)
  category?: ActivityCategory;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  @Max(24)
  hours?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description?: string;
}
