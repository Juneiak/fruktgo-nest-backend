import { Module, forwardRef } from '@nestjs/common';

import { OrderCustomerController } from './roles/customer/order.customer.controller';
import { OrderCustomerService } from './roles/customer/order.customer.service';

import { OrderSellerController } from './roles/seller/order.seller.controller';
import { OrderSellerService } from './roles/seller/order.seller.service';

import { OrderShopController } from './roles/shop/order.shop.controller';
import { OrderShopService } from './roles/shop/order.shop.service';

import { CustomerModule } from '../customer/customer.module';
import { NotificationModule } from '../notification/notification.module';
import { OrderAdminService } from './roles/admin/order.admin.service';
import { OrderAdminController } from './roles/admin/order.admin.controller';
import { OrderSharedService } from './shared/order.shared.service';

@Module({
  imports: [
    forwardRef(() => CustomerModule),
    forwardRef(() => NotificationModule)
  ],
  controllers: [
    OrderCustomerController,
    OrderSellerController,
    OrderShopController,
    OrderAdminController
  ],
  providers: [
    OrderCustomerService,
    OrderSellerService,
    OrderShopService,
    OrderAdminService,
    OrderSharedService,
  ],
  exports: [
    OrderSharedService,
  ],
})
export class OrderModule {} 