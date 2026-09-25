import { JoiningPackItem } from '../../entities/joining-pack-item.entity';

export interface JoiningPackItemDto {
  id: number;
  title: string;
  description: string | null;
  kind: string;
  isActive: boolean;
  acknowledged: boolean;
  acknowledgedAt: string | null;
}

export function toJoiningPackItemDto(
  item: JoiningPackItem,
  ack: { acknowledgedAt: Date } | null,
): JoiningPackItemDto {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    kind: item.kind,
    isActive: item.isActive,
    acknowledged: !!ack,
    acknowledgedAt: ack ? ack.acknowledgedAt.toISOString() : null,
  };
}
