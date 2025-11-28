import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopAccount, ShopAccountSchema } from './schemas/shop-account.schema';
import { SettlementPeriod, SettlementPeriodSchema } from './schemas/settlement-period.schema';
import { SettlementPeriodTransaction, SettlementPeriodTransactionSchema } from './schemas/settlement-period-transaction.schema';
import { ShopAccountService } from './shop-account.service';
import { SHOP_ACCOUNT_PORT } from './shop-account.port';

/**
 * =====================================================
 * МОДУЛЬ SHOP ACCOUNT
 * =====================================================
 * 
 * Счета магазинов и расчётные периоды:
 * - ShopAccount — финансовый счёт магазина
 * - SettlementPeriod — расчётный период (14-21 день)
 * - SettlementPeriodTransaction — транзакции в периоде
 * 
 * @see docs/modules/main/finance.md
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShopAccount.name, schema: ShopAccountSchema },
      { name: SettlementPeriod.name, schema: SettlementPeriodSchema },
      { name: SettlementPeriodTransaction.name, schema: SettlementPeriodTransactionSchema },
    ]),
  ],
  providers: [
    ShopAccountService,
    {
      provide: SHOP_ACCOUNT_PORT,
      useExisting: ShopAccountService,
    },
  ],
  exports: [SHOP_ACCOUNT_PORT],
})
export class ShopAccountModule {}

