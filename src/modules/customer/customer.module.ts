import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CustomerService } from '../../interface/http/customer/me/customer.me.role.service';
import { CustomerController } from '../../interface/http/customer/me/customer.me.controller';
import { CartCustomerService } from '../../interface/http/customer/cart/customer.cart.role.service';
import { CartCustomerController } from '../../interface/http/customer/cart/customer.cart.controller';
import { CustomerAdminController } from './roles/admin/customers.admin.controller';
import { CustomerAdminService } from './roles/admin/customer.admin.service';
import { NotificationModule } from '../../infra/notification/notification.module';
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