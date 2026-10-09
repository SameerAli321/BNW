import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interview } from '../entities/interview.entity';
import { Candidate } from '../entities/candidate.entity';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

/** Interview scheduling + emailed invitations. MailService comes from the global MailModule. */
@Module({
  imports: [TypeOrmModule.forFeature([Interview, Candidate, User, Notification])],
  controllers: [InterviewsController],
  providers: [InterviewsService],
})
export class InterviewsModule {}
