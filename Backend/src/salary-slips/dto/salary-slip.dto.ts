import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SALARY_PAYMENT_METHODS, SalarySlipEmailStatus } from '../../common/enums/salary-slip.enum';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_AMOUNT = 100_000_000;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class SalaryLineItemDto {
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Give each allowance / deduction a name' })
  @MaxLength(60)
  label: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Amounts must be numbers with up to 2 decimals' })
  @Min(0, { message: 'Amounts cannot be negative' })
  @Max(MAX_AMOUNT)
  amount: number;
}

/** POST /salary-slips — HR / ADMIN. */
export class CreateSalarySlipDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  employeeId: number;

  @Matches(MONTH_PATTERN, { message: 'salaryMonth must be YYYY-MM' })
  salaryMonth: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Enter the basic salary' })
  @Min(0)
  @Max(MAX_AMOUNT)
  basicSalary: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12, { message: 'Up to 12 allowances and 12 deductions' })
  @ValidateNested({ each: true })
  @Type(() => SalaryLineItemDto)
  allowances?: SalaryLineItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  bonus?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  overtime?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12, { message: 'Up to 12 allowances and 12 deductions' })
  @ValidateNested({ each: true })
  @Type(() => SalaryLineItemDto)
  deductions?: SalaryLineItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_AMOUNT)
  tax?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'paymentDate must be YYYY-MM-DD' })
  paymentDate?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(SALARY_PAYMENT_METHODS)
  paymentMethod?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(31)
  workingDays?: number;

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
