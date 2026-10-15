import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppSetting } from '../entities/app-setting.entity';
import { User } from '../entities/user.entity';
import { AboutController } from './about.controller';
import { AboutService } from './about.service';

/** About us page: company details + the CEO's message and photo (stored in app_settings). */
@Module({
  imports: [TypeOrmModule.forFeature([AppSetting, User])],
  controllers: [AboutController],
  providers: [AboutService],
})
export class AboutModule {}
