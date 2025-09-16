import { Module } from '@nestjs/common';
import { EmployeeSellerController } from './roles/seller/employee.seller.controller';
import { EmployeeSellerService } from './roles/seller/employee.seller.service';
import { EmployeeAdminController } from './roles/admin/employee.admin.controller';
import { EmployeeAdminService } from './roles/admin/employee.admin.service';
import { EmployeeController } from './roles/employee/employee.controller';
import { EmployeeService } from './roles/employee/employee.service';
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