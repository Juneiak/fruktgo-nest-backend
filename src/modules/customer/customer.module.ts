import { Module, forwardRef } from '@nestjs/common';

import { CustomerForCustomerService } from './for-customer/customer-for-customer.service';
import { CustomerForCustomerController } from './for-customer/customer-for-customer.controller';
import { CartForCustomerService } from './for-customer/cart-for-customer.service';
import { CartForCustomerController } from './for-customer/cart-for-customer.controller';
import { CustomerForAdminController } from './for-admin/customer-for-admin.controller';
import { CustomerForAdminService } from './for-admin/customer-for-admin.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    forwardRef(() => NotificationModule),
  ],
  controllers: [CustomerForCustomerController, CartForCustomerController, CustomerForAdminController],
  providers: [CustomerForCustomerService, CartForCustomerService, CustomerForAdminService],
  exports: [CustomerForCustomerService, CartForCustomerService],
})
export class CustomerModule {}