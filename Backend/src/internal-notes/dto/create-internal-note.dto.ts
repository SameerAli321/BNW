import { IsIn, IsInt, IsString, MaxLength, MinLength } from 'class-validator';
import { NOTE_ENTITIES, NoteEntity } from '../note-entities';

export class CreateInternalNoteDto {
  @IsIn(NOTE_ENTITIES)
  entity: NoteEntity;

  @IsInt()
  entityId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  note: string;
}
