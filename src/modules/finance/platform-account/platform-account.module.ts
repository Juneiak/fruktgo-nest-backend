import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlatformAccount, PlatformAccountSchema } from './schemas/platform-account.schema';
import { PlatformAccountTransaction, PlatformAccountTransactionSchema } from './schemas/platform-account-transaction.schema';
import { PlatformAccountService } from './platform-account.service';
import { PLATFORM_ACCOUNT_PORT } from './platform-account.port';

/**
 * =====================================================
 * МОДУЛЬ PLATFORM ACCOUNT
 * =====================================================
 * 
 * Единственный счёт платформы с агрегатами:
 * - PlatformAccount — финансовые показатели платформы
 * - PlatformAccountTransaction — транзакции платформы
 * 
 * @see docs/modules/main/finance.md
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlatformAccount.name, schema: PlatformAccountSchema },
      { name: PlatformAccountTransaction.name, schema: PlatformAccountTransactionSchema },
    ]),
  ],
  providers: [
    PlatformAccountService,
    {
      provide: PLATFORM_ACCOUNT_PORT,
      useExisting: PlatformAccountService,
    },
  ],
  exports: [PLATFORM_ACCOUNT_PORT],
})
export class PlatformAccountModule {}
