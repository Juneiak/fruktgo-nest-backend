import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SellerAccount, SellerAccountSchema } from './schemas/seller-account.schema';
import { WithdrawalRequest, WithdrawalRequestSchema } from './schemas/withdrawal-request.schema';
import { SellerAccountService } from './seller-account.service';
import { SELLER_ACCOUNT_PORT } from './seller-account.port';

/**
 * =====================================================
 * МОДУЛЬ SELLER ACCOUNT
 * =====================================================
 * 
 * Счета продавцов и выводы средств:
 * - SellerAccount — баланс продавца (сумма со всех магазинов)
 * - WithdrawalRequest — заявки на вывод средств
 * 
 * @see docs/modules/main/finance.md
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SellerAccount.name, schema: SellerAccountSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
    ]),
  ],
  providers: [
    SellerAccountService,
    {
      provide: SELLER_ACCOUNT_PORT,
      useExisting: SellerAccountService,
    },
  ],
  exports: [SELLER_ACCOUNT_PORT],
})
export class SellerAccountModule {}
