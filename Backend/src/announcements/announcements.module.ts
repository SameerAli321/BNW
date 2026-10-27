import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from '../entities/announcement.entity';
import { Department } from '../entities/department.entity';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  imports: [TypeOrmModule.forFeature([Announcement, Department, Notification, User])],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
