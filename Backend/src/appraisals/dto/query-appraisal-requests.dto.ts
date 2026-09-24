import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { AppraisalStatus } from '../../common/enums/appraisal-status.enum';

/** GET /appraisal-requests (HR/ADMIN full list). */
export class QueryAppraisalRequestsDto {
  @IsOptional()
  @IsEnum(AppraisalStatus)
  status?: AppraisalStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  employeeId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
