import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from '../entities/work-order.entity';
import { AppSetting } from '../entities/app-setting.entity';
import { User } from '../entities/user.entity';
import { Notification } from '../entities/notification.entity';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrdersPdfService } from './work-orders-pdf.service';

/** Work orders: reimbursement claims + equipment requests with an approval chain. */
@Module({
  imports: [TypeOrmModule.forFeature([WorkOrder, AppSetting, User, Notification])],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, WorkOrdersPdfService],
})
export class WorkOrdersModule {}
