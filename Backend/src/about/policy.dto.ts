import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** POST /about/policy/acknowledge — the employee types their full name to sign. */
export class AcknowledgePolicyDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Type your full name to sign' })
  @MaxLength(255)
  signatureText: string;
}

/** POST /about/policy/remind — HR / Admin nudge people who haven't signed yet. */
export class RemindPolicyDto {
  /** Leave out to remind everyone still pending. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsInt({ each: true })
  userIds?: number[];
}
