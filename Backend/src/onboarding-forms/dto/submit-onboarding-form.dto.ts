import {
  Equals,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,19}$/;
const PHONE_MESSAGE = 'must be digits, e.g. 0300-1234567 or +92 300 1234567';

/**
 * PUT /onboarding-forms/mine — the employee's part of the form (submit, or resubmit until HR has
 * recorded it). Mobile and alternate numbers, the acknowledgement and the signature are required;
 * everything else is optional.
 */
export class SubmitOnboardingFormDto {
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'dateOfBirth must be a date in YYYY-MM-DD format' })
  dateOfBirth?: string;

  /** Kept on the form; also fills the account's joining date when that is still empty. */
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, { message: 'dateOfJoining must be a date in YYYY-MM-DD format' })
  dateOfJoining?: string;

  @IsOptional() @IsString() @MaxLength(60) nationalId?: string;
  @IsOptional() @IsString() @MaxLength(255) streetAddress?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(20) zipCode?: string;
  /** Mobile number. */
  @IsString({ message: 'Enter your mobile number' })
  @Matches(PHONE_PATTERN, { message: `Mobile number ${PHONE_MESSAGE}` })
  phone: string;

  @IsString({ message: 'Enter an alternate number' })
  @Matches(PHONE_PATTERN, { message: `Alternate number ${PHONE_MESSAGE}` })
  alternatePhone: string;

  @IsOptional() @IsString() @MaxLength(5000) reasonForLeaving?: string;
  @IsOptional() @IsString() @MaxLength(5000) workResponsibilities?: string;

  @IsOptional() @IsString() @MaxLength(150) emergencyContactName?: string;
  @IsOptional() @IsString() @MaxLength(60) emergencyContactRelationship?: string;
  @IsOptional() @IsString() @MaxLength(30) emergencyContactPhone?: string;
  @IsOptional() @IsString() @MaxLength(2000) emergencyContactAddress?: string;

  @IsOptional() @IsString() @MaxLength(150) bankName?: string;
  @IsOptional() @IsString() @MaxLength(150) accountTitle?: string;
  @IsOptional() @IsString() @MaxLength(60) accountNumber?: string;
  @IsOptional() @IsString() @MaxLength(40) iban?: string;

  @IsOptional() @IsString() @MaxLength(5000) medicalCondition?: string;

  // "I hereby certify that the information provided above is accurate and complete…"
  @IsBoolean()
  @Equals(true, { message: 'You must confirm the acknowledgment to submit the form' })
  acknowledged: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  signatureText: string;
}
