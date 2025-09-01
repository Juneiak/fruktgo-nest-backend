import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PenaltySchema } from './penalty.schema';
import { PenaltyService } from './penalty.service';
import { PenaltySharedService } from './shared/penalty.shared.service';
import { ShopAccountModule } from '../shop-account/shop-account.module';
import { ShopAccountSchema } from '../shop-account/schemas/shop-account.schema';
import { PenaltyAdminController } from './admin/penalty.admin.controller';
import { PenaltySellerController } from './seller/penalty.seller.controller';
import { PenaltyAdminService } from './admin/penalty.admin.service';
import { PenaltySellerService } from './seller/penalty.seller.service';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Penalty', schema: PenaltySchema },
      { name: 'ShopAccount', schema: ShopAccountSchema },
    ]),
    ShopAccountModule,
  ],
  controllers: [
    PenaltyAdminController,
    PenaltySellerController
  ],
  providers: [
    PenaltyAdminService,
    PenaltySellerService,
    PenaltyService,
    PenaltySharedService,
  ],
  exports: [PenaltySharedService]
})
export class PenaltyModule {}
