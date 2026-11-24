import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternalNote } from '../entities/internal-note.entity';
import { CreateInternalNoteDto } from './dto/create-internal-note.dto';
import { QueryInternalNotesDto } from './dto/query-internal-notes.dto';
import { NOTE_ENTITY_TABLES } from './note-entities';

export interface InternalNoteDto {
  id: number;
  entity: string;
  entityId: number;
  note: string;
  createdById: number | null;
  createdByName: string | null;
  createdAt: Date;
}

function toDto(row: InternalNote): InternalNoteDto {
  return {
    id: row.id,
    entity: row.entity,
    entityId: row.entityId,
    note: row.note,
    createdById: row.createdById,
    createdByName: row.createdBy ? `${row.createdBy.firstName} ${row.createdBy.lastName}` : null,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class InternalNotesService {
  constructor(
    @InjectRepository(InternalNote) private readonly notesRepo: Repository<InternalNote>,
  ) {}

  /** Anyone, straight after creating the record. The author is always the caller. */
  async create(dto: CreateInternalNoteDto, callerId: number): Promise<InternalNoteDto> {
    // The table name comes from the fixed map (the DTO only allows its keys), never from input.
    const table = NOTE_ENTITY_TABLES[dto.entity];
    const [found] = await this.notesRepo.query(`SELECT 1 FROM "${table}" WHERE "id" = $1`, [
      dto.entityId,
    ]);
    if (!found) throw new NotFoundException('The record this note is for was not found');

    const saved = await this.notesRepo.save(
      this.notesRepo.create({
        entity: dto.entity,
        entityId: dto.entityId,
        note: dto.note.trim(),
        createdById: callerId,
      }),
    );
    return toDto(
      await this.notesRepo.findOneOrFail({ where: { id: saved.id }, relations: ['createdBy'] }),
    );
  }

  /** HR / Admin — newest first. */
  async list(query: QueryInternalNotesDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 200);
    const qb = this.notesRepo
      .createQueryBuilder('n')
      .leftJoinAndSelect('n.createdBy', 'author')
      .orderBy('n.createdAt', 'DESC')
      .addOrderBy('n.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);
    if (query.entity) qb.andWhere('n.entity = :entity', { entity: query.entity });
    if (query.entityId) qb.andWhere('n.entityId = :entityId', { entityId: query.entityId });
    if (query.q?.trim()) {
      qb.andWhere(`(n.note ILIKE :q OR (author.firstName || ' ' || author.lastName) ILIKE :q)`, {
        q: `%${query.q.trim()}%`,
      });
    }
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map(toDto), meta: { total, page, limit } };
  }

  /** HR / Admin. */
  async remove(id: number): Promise<void> {
    const result = await this.notesRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Note not found');
  }
}
