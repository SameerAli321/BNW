import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JoiningPackItem } from '../entities/joining-pack-item.entity';
import { JoiningPackAck } from '../entities/joining-pack-ack.entity';
import {
  JoiningPackItemDto,
  toJoiningPackItemDto,
} from '../common/mappers/joining-pack-item.mapper';
import { CreateJoiningPackItemDto } from './dto/create-joining-pack-item.dto';
import { UpdateJoiningPackItemDto } from './dto/update-joining-pack-item.dto';

@Injectable()
export class JoiningPackService {
  constructor(
    @InjectRepository(JoiningPackItem)
    private readonly itemsRepo: Repository<JoiningPackItem>,
    @InjectRepository(JoiningPackAck)
    private readonly acksRepo: Repository<JoiningPackAck>,
  ) {}

  /**
   * GET /joining-pack-items — every active item plus `acknowledged`/`acknowledgedAt` computed
   * for the caller (left join against joining_pack_acks for caller.sub), per the contract.
   */
  async findAllForUser(userId: number): Promise<JoiningPackItemDto[]> {
    const items = await this.itemsRepo.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
    const acks = await this.acksRepo.find({ where: { userId } });
    const ackByItemId = new Map(acks.map((ack) => [ack.itemId, ack]));

    return items.map((item) => toJoiningPackItemDto(item, ackByItemId.get(item.id) ?? null));
  }

  async create(dto: CreateJoiningPackItemDto): Promise<JoiningPackItemDto> {
    const item = this.itemsRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      kind: dto.kind,
      isActive: true,
    });
    const saved = await this.itemsRepo.save(item);
    return toJoiningPackItemDto(saved, null);
  }

  async update(id: number, dto: UpdateJoiningPackItemDto): Promise<JoiningPackItemDto> {
    const item = await this.itemsRepo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Joining pack item not found');
    }

    if (dto.title !== undefined) item.title = dto.title;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.kind !== undefined) item.kind = dto.kind;
    if (dto.isActive !== undefined) item.isActive = dto.isActive;

    const saved = await this.itemsRepo.save(item);
    return toJoiningPackItemDto(saved, null);
  }

  /**
   * POST /joining-pack-items/:id/acknowledge — idempotent upsert on (userId, itemId). Re-
   * acknowledging returns the existing acknowledgedAt unchanged, per the contract.
   */
  async acknowledge(itemId: number, userId: number): Promise<JoiningPackItemDto> {
    const item = await this.itemsRepo.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Joining pack item not found');
    }

    let ack = await this.acksRepo.findOne({ where: { userId, itemId } });
    if (!ack) {
      ack = await this.acksRepo.save(this.acksRepo.create({ userId, itemId }));
    }

    return toJoiningPackItemDto(item, ack);
  }
}
