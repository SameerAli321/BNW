import { applyDecorators } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  SALARY_PAYMENT_METHODS,
  SalarySlipEmailStatus,
  SecurityDeductionMode,
} from '../../common/enums/salary-slip.enum';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_AMOUNT = 100_000_000;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

/** An optional rupee amount: number ≥ 0 with up to 2 decimals. */
const Amount = (message = 'Amounts must be numbers with up to 2 decimals') =>
  applyDecorators(
    IsOptional(),
    Type(() => Number),
    IsNumber({ maxDecimalPlaces: 2 }, { message }),
    Min(0, { message: 'Amounts cannot be negative' }),
    Max(MAX_AMOUNT),
  );

/**
 * The payroll sheet's manual inputs, shared by the slip form and the sheet. Unpaid holidays allow
 * half days (the sample sheet has 2.5 + 6). Tax is not here: only the accountant enters it, on the
 * sheet (UpdatePayrollEntryDto), and a slip always takes it from there.
 */
class PayrollInputsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Unpaid holidays must be a number' })
  @Min(0)
  @Max(31)
  unpaidDays?: number;

  @IsOptional()
  @IsEnum(SecurityDeductionMode)
  securityMode?: SecurityDeductionMode;

  /** Used when securityMode is MANUAL. */
  @Amount()
  securityAmount?: number;

  @Amount()
  nonTaxableAddition?: number;

  @Amount()
  taxableAddition?: number;
}

/** POST /salary-slips — HR / ADMIN. Calculated with the payroll sheet formula. */
export class CreateSalarySlipDto extends PayrollInputsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  employeeId: number;

  @Matches(MONTH_PATTERN, { message: 'salaryMonth must be YYYY-MM' })
  salaryMonth: string;

  /** Gross salary (the column is basic_salary). */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Enter the gross salary' })
  @Min(0)
  @Max(MAX_AMOUNT)
  basicSalary: number;

  @Type(() => Number)
  @IsInt({ message: 'Working days must be a whole number' })
  @Min(1, { message: 'Working days must be at least 1' })
  @Max(31)
  workingDays: number;

  /** Leave out to take the next instalment of the employee's loan; set to override it. */
  @Amount()
  loanDeduction?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'paymentDate must be YYYY-MM-DD' })
  paymentDate?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(SALARY_PAYMENT_METHODS)
  paymentMethod?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  /** Must be true to replace an existing slip for the same employee + month (adds a revision). */
  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}

/** GET /salary-slips/defaults — what the generate form starts from. */
export class SalarySlipDefaultsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  employeeId: number;

  @IsOptional()
  @Matches(MONTH_PATTERN, { message: 'salaryMonth must be YYYY-MM' })
  salaryMonth?: string;
}

export class QuerySalarySlipsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  employeeId?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(MONTH_PATTERN, { message: 'salaryMonth must be YYYY-MM' })
  salaryMonth?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(SalarySlipEmailStatus)
  emailStatus?: SalarySlipEmailStatus;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  /** Also list older revisions that were regenerated. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeSuperseded?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

// ------------------------------------------------------------------------------------------------
// Payroll sheet

/** GET /payroll — the sheet for one month. */
export class PayrollQueryDto {
  @Matches(MONTH_PATTERN, { message: 'month must be YYYY-MM' })
  month: string;
}

/**
 * PUT /payroll/:employeeId — save one row of the sheet. Send only the cells that changed.
 * HR / ADMIN may change every cell except `tax`; the accountant (PAYROLL role) only `tax` and
 * `paid`. Tax is the accountant's alone.
 */
export class UpdatePayrollEntryDto extends PayrollInputsDto {
  @Matches(MONTH_PATTERN, { message: 'month must be YYYY-MM' })
  month: string;

  @Amount()
  tax?: number;

  @Amount('Enter the gross salary')
  grossSalary?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Working days must be a whole number' })
  @Min(1, { message: 'Working days must be at least 1' })
  @Max(31)
  workingDays?: number;

  /** A number overrides this month's loan instalment; null goes back to the loan schedule. */
  @IsOptional()
  @ValidateIf((_dto, value) => value !== null)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amounts must be numbers with up to 2 decimals' })
  @Min(0, { message: 'Amounts cannot be negative' })
  @Max(MAX_AMOUNT)
  loanOverride?: number | null;

  @Amount()
  paid?: number;
}

/** PUT /payroll/working-days — the sheet's "Number of working days", applied to every row. */
export class PayrollWorkingDaysDto {
  @Matches(MONTH_PATTERN, { message: 'month must be YYYY-MM' })
  month: string;

  @Type(() => Number)
  @IsInt({ message: 'Working days must be a whole number' })
  @Min(1, { message: 'Working days must be at least 1' })
  @Max(31)
  workingDays: number;
}

/** POST /payroll/:employeeId/generate — generate (or regenerate) the slip from the sheet row. */
export class GenerateFromPayrollDto {
  @Matches(MONTH_PATTERN, { message: 'month must be YYYY-MM' })
  month: string;

  @IsOptional()
  @IsBoolean()
  regenerate?: boolean;
}

// ------------------------------------------------------------------------------------------------
// Loans

/** POST /loans — e.g. Rs 100,000 over 6 months from 2026-11. */
export class CreateLoanDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  employeeId: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Enter the loan amount' })
  @Min(1, { message: 'The loan amount must be more than zero' })
  @Max(MAX_AMOUNT)
  principal: number;

  @Type(() => Number)
  @IsInt({ message: 'Choose how many months to repay over' })
  @Min(1, { message: 'At least 1 month' })
  @Max(60, { message: 'At most 60 months' })
  instalments: number;

  @Matches(MONTH_PATTERN, { message: 'startMonth must be YYYY-MM' })
  startMonth: string;

  @Transform(emptyToUndefined)
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class QueryLoansDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  employeeId?: number;

  /** Also list loans that were cancelled or fully repaid. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  includeClosed?: boolean;
}
