import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopAccountControllerForAdmin, ShopAccountControllerForSeller } from './shop-account.controllers';

import { ShopAccountSchema } from './schemas/shop-account.schema';
import { SettlementPeriodSchema } from './schemas/settlement-period.schema'
import { SettlementPeriodTransactionSchema } from './schemas/settlement-period-transaction.schema'
import { ShopAccountServiceForAdmin, ShopAccountServiceForSeller } from './shop-account.role-services';
import { ShopAccountService } from './shop-account.service';
import { ShopAccountPublicService } from './shop-account.public.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ShopAccount', schema: ShopAccountSchema },
      { name: 'SettlementPeriod', schema: SettlementPeriodSchema },
      { name: 'SettlementPeriodTransaction', schema: SettlementPeriodTransactionSchema },
    ])
  ],
  controllers: [ShopAccountControllerForAdmin, ShopAccountControllerForSeller],
  providers: [
    ShopAccountService,
    ShopAccountServiceForAdmin,
    ShopAccountServiceForSeller,
    ShopAccountPublicService
  ],
  exports: [ShopAccountPublicService],
})
export class ShopAccountModule {}

