import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class UploadDocumentDto {
  @Type(() => Number)
  @IsInt()
  documentTypeId: number;
}
