import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { InterviewMode, InterviewStatus } from '../../common/enums/interview.enum';

/** Schedule (POST /candidates/:id/interviews), preview, and reschedule (PATCH /interviews/:id). */
export class ScheduleInterviewDto {
  /** Interview day in Pakistan time, 'YYYY-MM-DD'. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date: string;

  /** Start time in Pakistan time, 24h 'HH:mm'. */
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time must be HH:mm' })
  time: string;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(480)
  durationMinutes: number;

  @IsEnum(InterviewMode)
  mode: InterviewMode;

  @ValidateIf((dto: ScheduleInterviewDto) => dto.mode === InterviewMode.ONLINE)
  @IsUrl(
    { require_protocol: true },
    { message: 'Enter the full meeting link, starting with https://' },
  )
  @MaxLength(500)
  meetingLink?: string | null;

  @ValidateIf((dto: ScheduleInterviewDto) => dto.mode === InterviewMode.IN_PERSON)
  @IsString()
  @MaxLength(300)
  location?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  interviewerIds?: number[];

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  message?: string | null;

  /** Reschedule only — false skips re-emailing (e.g. fixing a typo in the note). Default true. */
  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}

export class CancelInterviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  /** Default true — email the candidate and interviewers that it's cancelled. */
  @IsOptional()
  @IsBoolean()
  notify?: boolean;
}

export class InterviewOutcomeDto {
  @IsIn([InterviewStatus.COMPLETED, InterviewStatus.NO_SHOW])
  status: InterviewStatus.COMPLETED | InterviewStatus.NO_SHOW;
}

export class QueryInterviewsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  candidateId?: number;

  /** 'true' → only SCHEDULED interviews that haven't happened yet. */
  @IsOptional()
  @IsIn(['true', 'false'])
  upcoming?: string;
}
