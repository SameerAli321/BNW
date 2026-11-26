import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLetterDto {
  @IsObject()
  fieldValues: Record<string, string>;

  /** The letter's Notes (printed above the sign-off); blank removes them, omitted leaves them. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
