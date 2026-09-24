import { IsString, MinLength } from 'class-validator';

export class SignLetterDto {
  @IsString()
  @MinLength(1)
  signatureText: string;
}
