import { Module, forwardRef} from '@nestjs/common';

import { NotificationModule } from 'src/modules/notification/notification.module';
import { ShiftSellerController } from './roles/seller/shift.seller.controller';
import { ShiftSellerService } from './roles/seller/shift.seller.service';
import { ShiftAdminService } from './roles/admin/shift.admin.service';
import { ShiftShopService } from './roles/shop/shift.shop.service';
import { ShiftAdminController } from './roles/admin/shift.admin.controller';
import { ShiftShopController } from './roles/shop/shift.shop.controller';
import { ShiftSharedService } from './shared/shift.shared.service';
import { ShiftService } from './shift.service';

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
    ShiftService,
  ],
  exports: [
    ShiftSharedService,
    ShiftService,
  ],
})
export class ShiftModule {}