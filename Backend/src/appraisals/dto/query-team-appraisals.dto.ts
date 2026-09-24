import { IsEnum, IsOptional } from 'class-validator';
import { AppraisalStatus } from '../../common/enums/appraisal-status.enum';

/** GET /appraisal-requests/team — defaults to PENDING_MANAGER when `status` is omitted. */
export class QueryTeamAppraisalsDto {
  @IsOptional()
  @IsEnum(AppraisalStatus)
  status?: AppraisalStatus;
}
