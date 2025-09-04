import { Module, forwardRef} from '@nestjs/common';

import { NotificationModule } from 'src/modules/notification/notification.module';
import { UploadsModule } from 'src/common/modules/uploads/uploads.module';
import { ShopSellerController } from './seller/shop.seller.controller';
import { ShopAdminController } from './admin/shop.admin.controller';
import { ShopPublicController } from './public/shop.public.controller';
import { ShopSellerService } from './seller/shop.seller.service';
import { ShopAdminService } from './admin/shop.admin.service';
import { ShopPublicService } from './public/shop.public.service';
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