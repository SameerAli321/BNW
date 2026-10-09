import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// '' from a cleared form field means "remove the value".
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

/** '3520212345671' / '35202-1234567-1' → '35202-1234567-1'. */
export const normalizeCnic = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const digits = value.replace(/[\s-]/g, '');
  if (digits === '') return null;
  return /^\d{13}$/.test(digits)
    ? `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`
    : value.trim();
};

/**
 * The "Employee Information" fields the client asked for that aren't plain user columns already —
 * shared by CreateUserDto and UpdateUserDto (all optional; null clears a value).
 */
export class EmployeeInfoFields {
  @Transform(emptyToNull)
  @IsOptional()
  @IsDateString({}, { message: 'Leaving date must be a valid date' })
  leavingDate?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9][0-9\s-]{6,19}$/, {
    message: 'Contact number must be digits (e.g. 0300-1234567 or +92 300 1234567)',
  })
  contactNumber?: string | null;

  @Transform(normalizeCnic)
  @IsOptional()
  @Matches(/^\d{5}-\d{7}-\d$/, { message: 'CNIC must be 13 digits, e.g. 35202-1234567-1' })
  cnic?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Current salary must be an amount in rupees' })
  @Min(0)
  @Max(100_000_000)
  currentSalary?: number | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Previous salary must be an amount in rupees' })
  @Min(0)
  @Max(100_000_000)
  previousSalary?: number | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  deductionPolicy?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @IsDateString({}, { message: 'Last salary change date must be a valid date' })
  lastSalaryChangeDate?: string | null;
}
