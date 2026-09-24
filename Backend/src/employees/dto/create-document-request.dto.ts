import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class CreateDocumentRequestDto {
  @IsInt()
  documentTypeId: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
