import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Small key/value store for settings HR / Admin can change from the app (e.g. the work-order
 * amount above which the CEO must approve). Values are JSON.
 */
@Entity('app_settings')
export class AppSetting {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'jsonb' })
  value: unknown;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
