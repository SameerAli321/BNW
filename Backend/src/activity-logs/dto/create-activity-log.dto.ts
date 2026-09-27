import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ActivityCategory } from '../../common/enums/activity-category.enum';

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateActivityLogDto {
  @Matches(DATE_ONLY_PATTERN, { message: 'activityDate must be a date in YYYY-MM-DD format' })
  activityDate: string;

  @IsEnum(ActivityCategory)
  category: ActivityCategory;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  @Max(24)
  hours: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description: string;
}
