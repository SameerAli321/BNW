import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from '../entities/notification.entity';
import { NotificationDto, toNotificationDto } from '../common/mappers/notification.mapper';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly notificationsRepo: Repository<Notification>,
  ) {}

  async findAllForUser(
    userId: number,
    query: QueryNotificationsDto,
  ): Promise<{ data: NotificationDto[]; meta: { total: number; unreadCount: number } }> {
    const qb = this.notificationsRepo
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (query.unreadOnly) {
      qb.andWhere('notification.readAt IS NULL');
    }
    qb.orderBy('notification.createdAt', 'DESC');

    const [rows, total] = await qb.getManyAndCount();
    const unreadCount = await this.notificationsRepo.count({
      where: { userId, readAt: IsNull() },
    });

    return { data: rows.map(toNotificationDto), meta: { total, unreadCount } };
  }

  async markRead(id: number, callerId: number): Promise<NotificationDto> {
    const notification = await this.notificationsRepo.findOne({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== callerId) {
      throw new ForbiddenException('You do not have access to this notification');
    }
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notificationsRepo.save(notification);
    }
    return toNotificationDto(notification);
  }
}
