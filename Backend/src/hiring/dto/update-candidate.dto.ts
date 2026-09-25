import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CandidateStatus } from '../../common/enums/candidate-status.enum';

export class UpdateCandidateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(CandidateStatus)
  status?: CandidateStatus;
}
