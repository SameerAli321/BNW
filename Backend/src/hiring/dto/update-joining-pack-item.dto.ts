import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { JoiningPackItemKind } from '../../common/enums/joining-pack-item-kind.enum';

export class UpdateJoiningPackItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(JoiningPackItemKind)
  kind?: JoiningPackItemKind;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
