import { Module, forwardRef } from '@nestjs/common';

import { OrderCustomerController } from './customer/order.customer.controller';
import { OrderCustomerService } from './customer/order.customer.service';

import { OrderSellerController } from './seller/order.seller.controller';
import { OrderSellerService } from './seller/order.seller.service';

import { OrderShopController } from './shop/order.shop.controller';
import { OrderShopService } from './shop/order.shop.service';

import { CustomerModule } from '../customer/customer.module';
import { NotificationModule } from '../notification/notification.module';
import { OrderAdminService } from './admin/order.admin.service';
import { OrderAdminController } from './admin/order.admin.controller';
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
    OrderAdminService
  ],
  exports: [
    OrderSharedService,
  ],
})
export class OrderModule {} 