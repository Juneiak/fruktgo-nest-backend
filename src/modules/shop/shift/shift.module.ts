import { Module, forwardRef} from '@nestjs/common';

import { NotificationModule } from 'src/modules/notification/notification.module';
import { ShiftSellerController } from './seller/shift.seller.controller';
import { ShiftSellerService } from './seller/shift.seller.service';
import { ShiftAdminService } from './admin/shift.admin.service';
import { ShiftShopService } from './shop/shift.shop.service';
import { ShiftAdminController } from './admin/shift.admin.controller';
import { ShiftShopController } from './shop/shift.shop.controller';
import { ShiftSharedService } from './shared/shift.shared.service';

@Module({
  imports: [
    forwardRef(() => NotificationModule),
  ],
  controllers: [
    ShiftSellerController,
    ShiftAdminController,
    ShiftShopController,
  ],
  providers: [
    ShiftSellerService,
    ShiftAdminService,
    ShiftShopService,
    ShiftSharedService,
  ],
  exports: [
    ShiftSharedService
  ],
})
export class ShopModule {}