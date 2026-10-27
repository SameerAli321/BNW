import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { WorkOrderStatus, WorkOrderType } from '../../common/enums/work-order.enum';

// Multipart form fields always arrive as strings — turn '' into undefined so @IsOptional works.
const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

/** POST /work-orders — multipart/form-data (optional `receipt` file). */
export class CreateWorkOrderDto {
  @IsEnum(WorkOrderType)
  type: WorkOrderType;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  category: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description: string;

  /** Required for a reimbursement; optional estimated cost for equipment. PKR. */
  @Transform(emptyToUndefined)
  @ValidateIf(
    (dto: CreateWorkOrderDto) =>
      dto.type === WorkOrderType.REIMBURSEMENT || dto.amount !== undefined,
  )
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Enter the amount in rupees' })
  @Min(1, { message: 'The amount must be more than zero' })
  @Max(100_000_000)
  amount?: number;

  @Transform(emptyToUndefined)
  @ValidateIf((dto: CreateWorkOrderDto) => dto.type === WorkOrderType.REIMBURSEMENT)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Enter the date you spent the money' })
  expenseDate?: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity?: number;

  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'neededBy must be YYYY-MM-DD' })
  neededBy?: string;
}

// On edit, '' means "clear this optional field" (null); a field that isn't sent keeps its value.
const emptyToNull = ({ value }: { value: unknown }) => (value === '' ? null : value);

/**
 * PATCH /work-orders/:id — multipart/form-data, editable until the first decision. Same fields as
 * CreateWorkOrderDto except `type` (fixed once submitted), all optional. A new `receipt` file
 * replaces the old one; `removeReceipt=true` drops it.
 */
export class UpdateWorkOrderDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description?: string;

  @Transform(emptyToNull)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Enter the amount in rupees' })
  @Min(1, { message: 'The amount must be more than zero' })
  @Max(100_000_000)
  amount?: number | null;

  @Transform(emptyToNull)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Enter the date you spent the money' })
  expenseDate?: string | null;

  @Transform(emptyToNull)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity?: number | null;

  @Transform(emptyToNull)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'neededBy must be YYYY-MM-DD' })
  neededBy?: string | null;

  @Transform(({ value }: { value: unknown }) => value === true || value === 'true')
  @IsOptional()
  @IsBoolean()
  removeReceipt?: boolean;
}

/** Manager and CEO decisions. */
export class WorkOrderDecisionDto {
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remarks?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  signatureText: string;
}

/** Payroll (reimbursement) / HR or Admin (equipment) — the final step. */
export class ProcessWorkOrderDto extends WorkOrderDecisionDto {
  /** Payment reference, or asset tag / serial number for equipment. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  /**
   * Approving a reimbursement: add it to this month's payroll (non-taxable addition on the
   * payroll sheet) or pay it separately. Required then; ignored otherwise.
   */
  @IsOptional()
  @IsIn(['ADD_TO_PAYROLL', 'PAID_SEPARATELY'])
  payment?: 'ADD_TO_PAYROLL' | 'PAID_SEPARATELY';
}

export class QueryWorkOrdersDto {
  @IsOptional()
  @IsEnum(WorkOrderType)
  type?: WorkOrderType;

  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export class UpdateWorkOrderSettingsDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100_000_000)
  ceoApprovalLimit: number;
}
