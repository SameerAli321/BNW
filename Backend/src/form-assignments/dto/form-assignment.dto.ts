import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FormAssignmentStatus, FormAssignmentType } from '../../common/enums/form-assignment.enum';

/** POST /form-assignments — HR / Admin send one form to 1–100 employees. */
export class CreateFormAssignmentDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Pick at least one employee' })
  @ArrayMaxSize(100, { message: 'Send to at most 100 employees at a time' })
  @ArrayUnique()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  userIds: number[];

  @IsEnum(FormAssignmentType, { message: 'Pick a form' })
  formType: FormAssignmentType;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate must be a date in YYYY-MM-DD format' })
  dueDate?: string;
}

/** GET /form-assignments/mine */
export class QueryMyFormAssignmentsDto {
  @IsOptional()
  @IsEnum(FormAssignmentStatus)
  status?: FormAssignmentStatus;
}

/** GET /form-assignments — HR / Admin. */
export class QueryFormAssignmentsDto {
  @IsOptional()
  @IsEnum(FormAssignmentStatus)
  status?: FormAssignmentStatus;

  @IsOptional()
  @IsEnum(FormAssignmentType)
  formType?: FormAssignmentType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

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

/** What every form-assignment endpoint returns. `link` is the frontend page to fill the form in. */
export type FormAssignmentDto = {
  id: number;
  userId: number;
  userName: string;
  formType: FormAssignmentType;
  formLabel: string;
  message: string | null;
  dueDate: string | null;
  status: FormAssignmentStatus;
  assignedById: number | null;
  assignedByName: string | null;
  completedAt: string | null;
  createdAt: string;
  link: string;
};
