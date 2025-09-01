import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopAccountSchema } from './schemas/shop-account.schema';
import { SettlementPeriodSchema } from './schemas/settlement-period.schema'
import { SettlementPeriodTransactionSchema } from './schemas/settlement-period-transaction.schema'
import { ShopAccountService } from './shop-account.service';
import { ShopAccountSharedService } from './shared/shop-account.shared.service';
import { ShopAccountAdminService } from './admin/shop-account.admin.service';
import { ShopAccountSellerService } from './seller/shop-account.seller.service';
import { ShopAccountAdminController } from './admin/shop-account.admin.controller';
import { ShopAccountSellerController } from './seller/shop-account.seller.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ShopAccount', schema: ShopAccountSchema },
      { name: 'SettlementPeriod', schema: SettlementPeriodSchema },
      { name: 'SettlementPeriodTransaction', schema: SettlementPeriodTransactionSchema },
    ])
  ],
  controllers: [ShopAccountAdminController, ShopAccountSellerController],
  providers: [
    ShopAccountService,
    ShopAccountAdminService,
    ShopAccountSellerService,
    ShopAccountSharedService
  ],
  exports: [ShopAccountSharedService],
})
export class ShopAccountModule {}

