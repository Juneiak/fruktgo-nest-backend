import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CustomerService } from './roles/customer/customer.service';
import { CustomerController } from './roles/customer/customer.controller';
import { CartCustomerService } from './roles/customer/cart.customer.service';
import { CartCustomerController } from './roles/customer/cart.customer.controller';
import { CustomerAdminController } from './roles/admin/customers.admin.controller';
import { CustomerAdminService } from './roles/admin/customer.admin.service';
import { NotificationModule } from '../notification/notification.module';
import { CustomerSchema } from './schemas/customer.schema';
import { CustomerSharedService } from './shared/customer.shared.service';

@Module({
  imports: [
    forwardRef(() => NotificationModule),
    MongooseModule.forFeature([{ name: 'Customer', schema: CustomerSchema }]),
  ],
  controllers: [CustomerController, CartCustomerController, CustomerAdminController],
  providers: [
    CustomerService,
    CartCustomerService,
    CustomerAdminService,
    CustomerSharedService,
  ],
  exports: [CustomerSharedService, CartCustomerService],
})
export class CustomerModule {}