import { IsInt, IsObject, IsOptional } from 'class-validator';

export class CreateLetterDto {
  @IsInt()
  templateId: number;

  // Exactly one of subjectUserId / subjectCandidateId — checked in LettersService.createLetter.
  @IsOptional()
  @IsInt()
  subjectUserId?: number;

  // A hiring candidate who has no account yet; the letter moves to their account on conversion.
  @IsOptional()
  @IsInt()
  subjectCandidateId?: number;

  @IsOptional()
  @IsObject()
  fieldValues?: Record<string, string>;
}
