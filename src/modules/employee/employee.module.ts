import { Module } from '@nestjs/common';
import { EmployeeForSellerController } from './for-seller/employee-for-seller.controller';
import { EmployeeForSellerService } from './for-seller/employee-for-seller.service';
import { EmployeeForAdminService } from './for-admin/employee-for-admin.service';
import { EmployeeForAdminController } from './for-admin/employee-for-admin.controller';
import { EmployeeForEmployeeService } from './for-employee/employee-for-employee.service';
import { forwardRef } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';


@Module({
  imports: [
    forwardRef(() => NotificationModule)
  ],
  controllers: [EmployeeForSellerController, EmployeeForAdminController],
  providers: [
    EmployeeForSellerService,
    EmployeeForAdminService,
    EmployeeForEmployeeService
  ],
  exports: [EmployeeForEmployeeService, EmployeeForSellerService],
})
export class EmployeeModule {}