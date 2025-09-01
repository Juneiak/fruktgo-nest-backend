import { Module } from '@nestjs/common';
import { EmployeeSellerController } from './seller/employee.seller.controller';
import { EmployeeSellerService } from './seller/employee.seller.service';
import { EmployeeAdminController } from './admin/employee.admin.controller';
import { EmployeeAdminService } from './admin/employee.admin.service';
import { EmployeeController } from './employee/employee.controller';
import { EmployeeService } from './employee/employee.service';
import { forwardRef } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { EmployeeSharedService } from './shared/employee.shared.service';

@Module({
  imports: [
    forwardRef(() => NotificationModule)
  ],
  controllers: [
    EmployeeSellerController,
    EmployeeAdminController,
    EmployeeController
  ],
  providers: [
    EmployeeSellerService,
    EmployeeAdminService,
    EmployeeService,
    EmployeeSharedService
  ],
  exports: [EmployeeSharedService],
})
export class EmployeeModule {}