import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ComplaintStatus } from '../../common/enums/complaint-status.enum';

/**
 * PATCH /complaints/:id/hr-response — the paper form's "Human Resource Department Only" section.
 * Partial update: omitted fields keep their stored value. A non-empty `signatureText` (re)signs the
 * form as the caller.
 */
export class HrResponseDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comments?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  actionRequested?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  acknowledgement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  signatureText?: string;

  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;
}
