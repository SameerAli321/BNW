import { IsString, MinLength } from 'class-validator';

export class RequestChangesDto {
  @IsString()
  @MinLength(1)
  comment: string;
}
