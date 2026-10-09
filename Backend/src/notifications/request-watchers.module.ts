import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import { RequestWatchersService } from './request-watchers.service';
import { NotifyService } from './notify.service';

/**
 * Global so every workflow module can inject NotifyService (bell + email) and
 * RequestWatchersService ("notify me about every new request") without importing this module.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Notification])],
  providers: [RequestWatchersService, NotifyService],
  exports: [RequestWatchersService, NotifyService],
})
export class RequestWatchersModule {}
