import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CustomerService } from './customer/customer.service';
import { CustomerController } from './customer/customer.controller';
import { CartCustomerService } from './customer/cart.customer.service';
import { CartCustomerController } from './customer/cart.customer.controller';
import { CustomerAdminController } from './admin/customer.admin.controller';
import { CustomerAdminService } from './admin/customer.admin.service';
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