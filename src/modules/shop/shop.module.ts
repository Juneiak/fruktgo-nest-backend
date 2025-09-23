import { Module, forwardRef} from '@nestjs/common';

import { NotificationModule } from 'src/infra/notification/notification.module';
import { UploadsModule } from 'src/infra/uploads/uploads.module';
import { ShopSellerController } from './roles/seller/shop.seller.controller';
import { ShopAdminController } from './roles/admin/shop.admin.controller';
import { ShopPublicController } from './roles/public/shop.public.controller';
import { ShopSellerService } from './roles/seller/shop.seller.service';
import { ShopAdminService } from './roles/admin/shop.admin.service';
import { ShopPublicService } from './roles/public/shop.public.service';
import { ShopSharedService } from './shared/shop.shared.service'


@Module({
  imports: [
    forwardRef(() => NotificationModule),
    forwardRef(() => UploadsModule)
  ],
  controllers: [
    ShopSellerController,
    ShopAdminController,
    ShopPublicController,
  ],
  providers: [
    ShopSellerService,
    ShopAdminService,
    ShopPublicService,
    ShopSharedService,
  ],
  exports: [
    ShopSharedService
  ],
})
export class ShopModule {}