import { IsInt, IsObject, IsOptional } from 'class-validator';

export class CreateLetterDto {
  @IsInt()
  templateId: number;

  @IsInt()
  subjectUserId: number;

  @IsOptional()
  @IsObject()
  fieldValues?: Record<string, string>;
}
