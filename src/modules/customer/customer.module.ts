import { Module, forwardRef } from '@nestjs/common';

import { CustomerService } from './customer/customer.service';
import { CustomerController } from './customer/customer.controller';
import { CartCustomerService } from './customer/cart.customer.service';
import { CartCustomerController } from './customer/cart.customer.controller';
import { CustomerAdminController } from './admin/customer.admin.controller';
import { CustomerAdminService } from './admin/customer.admin.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    forwardRef(() => NotificationModule),
  ],
  controllers: [CustomerController, CartCustomerController, CustomerAdminController],
  providers: [CustomerService, CartCustomerService, CustomerAdminService],
  exports: [CustomerService, CartCustomerService],
})
export class CustomerModule {}