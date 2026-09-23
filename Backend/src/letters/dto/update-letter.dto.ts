import { IsObject } from 'class-validator';

export class UpdateLetterDto {
  @IsObject()
  fieldValues: Record<string, string>;
}
