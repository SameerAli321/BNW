import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidationArguments,
  registerDecorator,
} from 'class-validator';

/** "About me" on the Team Hierarchy side panel: a few lines only (client CEO, Oct 2026). */
export const ABOUT_ME_MAX_WORDS = 50;
export const ABOUT_ME_MAX_CHARS = 400;

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

function MaxWords(max: number) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'maxWords',
      target: object.constructor,
      propertyName,
      constraints: [max],
      options: { message: `Keep it to ${max} words or fewer` },
      validator: {
        validate: (value: unknown, args: ValidationArguments) =>
          typeof value !== 'string' || countWords(value) <= (args.constraints[0] as number),
      },
    });
}

/** PATCH /users/me/about — your own "About me"; empty clears it. */
export class AboutMeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(ABOUT_ME_MAX_CHARS, { message: `Keep it under ${ABOUT_ME_MAX_CHARS} characters` })
  @MaxWords(ABOUT_ME_MAX_WORDS)
  aboutMe: string | null;
}
