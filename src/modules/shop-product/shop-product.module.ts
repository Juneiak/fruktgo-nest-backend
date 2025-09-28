import { Module, forwardRef} from '@nestjs/common';

import { OrderModule } from 'src/modules/order/order.module'
import { NotificationModule } from 'src/infra/notification/notification.module';
import { UploadsModule } from 'src/infra/images/images.module';

import { ShopProductAdminService } from './roles/admin/shop-product.admin.service';
import { ShopProductPublicController } from '../../interface/http/public/shop-products/public.shop-products.controller';

import { ShopProductPublicService } from '../../interface/http/public/shop-products/public.shop-products.role.service'
import { ShopProductAdminController } from './roles/admin/shop-product.admin.controller';

import { ShopProductShopService } from '../../interface/http/shop/shop-products/shop.shop-products.role.service';
import { ShopProductShopController } from '../../interface/http/shop/shop-products/shop.shop-products.controller';

import { ShopProductSellerController } from '../../interface/http/seller/shop-products/seller.shop-products.controller';
import { ShopProductSellerService } from '../../interface/http/seller/shop-products/seller.shop-products.role.service';

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