import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Max, Min, ValidateIf } from 'class-validator';

/** PUT /leave-types/:id — HR / ADMIN. `annualQuota: null` = no limit. */
export class UpdateLeaveTypeDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(365)
  annualQuota?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
