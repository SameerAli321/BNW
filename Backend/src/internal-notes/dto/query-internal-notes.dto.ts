import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { NOTE_ENTITIES, NoteEntity } from '../note-entities';

/** GET /internal-notes — all filters optional; `q` searches the note text and the author's name. */
export class QueryInternalNotesDto {
  @IsOptional()
  @IsIn(NOTE_ENTITIES)
  entity?: NoteEntity;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  entityId?: number;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 25;
}
