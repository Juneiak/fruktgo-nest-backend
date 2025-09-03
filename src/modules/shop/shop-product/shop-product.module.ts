import { Module, forwardRef} from '@nestjs/common';

import { ShopForSellerService } from './old/for-seller/shop-for-seller.service';
import { ShopForAdminService } from './old/for-admin/shop-for-admin.service';
import { ShopForPublicService } from './old/for-public/shop-for-public.service';
import { ShopForSellerController } from './old/for-seller/shop-for-seller.controller';
import { ShopForAdminController } from './old/for-admin/shop-for-admin.controller';
import { ShopForPublicController } from './old/for-public/shop-for-public.controller';
import { ShopForShopController } from './old/for-shop/shop-for-shop.controller';
import { ShopForShopService } from './old/for-shop/shop-for-shop.service';
import { OrderModule } from 'src/modules/order/order.module'
import { NotificationModule } from 'src/modules/notification/notification.module';
import { UploadsModule } from 'src/common/modules/uploads/uploads.module';

@Module({
  imports: [
    forwardRef(() => OrderModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => UploadsModule)
  ],
  controllers: [
    ShopForSellerController,
    ShopForAdminController,
    ShopForPublicController,
    ShopForAdminController,
    ShopForPublicController,
    ShopForShopController
  ],
  providers: [
    ShopForSellerService,
    ShopForAdminService,
    ShopForPublicService,
    ShopForShopService,
  ],
  exports: [
    ShopForSellerService
  ],
})
export class ShopModule {}