import { Module, forwardRef } from '@nestjs/common';

import { OrderForCustomerController } from './for-customer/order-for-customer.controller';
import { OrderForCustomerService } from './for-customer/order-for-customer.service';

import { OrderForSellerController } from './for-seller/order-for-seller.controller';
import { OrderForSellerService } from './for-seller/order-for-seller.service';

import { OrderForShopController } from './for-shop/order-for-shop.controller';
import { OrderForShopService } from './for-shop/order-for-shop.service';

import { CustomerModule } from '../customer/customer.module';
import { NotificationModule } from '../notification/notification.module';
import { OrderForAdminService } from './for-admin/order-for-admin.service';
import { OrderForAdminController } from './for-admin/order-for-admin.controller';

@Module({
  imports: [
    forwardRef(() => CustomerModule),
    forwardRef(() => NotificationModule)
  ],
  controllers: [
    OrderForCustomerController,
    OrderForSellerController,
    OrderForShopController,
    OrderForAdminController
  ],
  providers: [
    OrderForCustomerService,
    OrderForSellerService,
    OrderForShopService,
    OrderForAdminService
  ],
  exports: [
    OrderForCustomerService,
    OrderForSellerService,
    OrderForShopService,
    OrderForAdminService
  ],
})
export class OrderModule {} 