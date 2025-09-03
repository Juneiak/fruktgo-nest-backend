import { Module, forwardRef} from '@nestjs/common';

import { OrderModule } from 'src/modules/order/order.module'
import { NotificationModule } from 'src/modules/notification/notification.module';
import { UploadsModule } from 'src/common/modules/uploads/uploads.module';

import { ShopProductAdminService } from './admin/shop-product.admin.service';
import { ShopProductPublicController } from './public/shop-product.public.controller';

import { ShopProductPublicService } from './public/shop-product.public.service'
import { ShopProductAdminController } from './admin/shop-product.admin.controller';

import { ShopProductShopService } from './shop/shop-product.shop.service';
import { ShopProductShopController } from './shop/shop-product.shop.controller';

import { ShopProductSellerController } from './seller/shop-product.seller.controller';
import { ShopProductSellerService } from './seller/shop-product.seller.service';

import { ShopProductSharedService } from './shared/shop-product.shared.service';


@Module({
  imports: [
    forwardRef(() => OrderModule),
    forwardRef(() => NotificationModule),
    forwardRef(() => UploadsModule)
  ],
  controllers: [
    ShopProductShopController,
    ShopProductAdminController,
    ShopProductPublicController,
    ShopProductSellerController,
  ],
  providers: [
    ShopProductShopService,
    ShopProductAdminService,
    ShopProductPublicService,
    ShopProductSellerService,
    ShopProductSharedService,
  ],
  exports: [
    ShopProductSharedService,
  ],
})
export class ShopProductModule {}