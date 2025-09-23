import { Module, forwardRef} from '@nestjs/common';

import { NotificationModule } from 'src/infra/notification/notification.module';
import { ShiftSellerController } from '../../interface/http/seller/shifts/seller.shifts.controller';
import { ShiftSellerService } from '../../interface/http/seller/shifts/seller.shifts.role.service';
import { ShiftAdminService } from './roles/admin/shift.admin.service';
import { ShiftShopService } from '../../interface/http/shop/shifts/shop.shifts.role.service';
import { ShiftAdminController } from './roles/admin/shift.admin.controller';
import { ShiftShopController } from '../../interface/http/shop/shifts/shop.shifts.controller';
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