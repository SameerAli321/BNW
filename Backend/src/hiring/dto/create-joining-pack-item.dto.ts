import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { JoiningPackItemKind } from '../../common/enums/joining-pack-item-kind.enum';

export class CreateJoiningPackItemDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(JoiningPackItemKind)
  kind: JoiningPackItemKind;
}
