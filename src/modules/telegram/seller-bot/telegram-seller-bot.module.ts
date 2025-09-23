import { Module, forwardRef } from '@nestjs/common';
import { TelegramSellerBotService } from './telegram-seller-bot.service'
import { SellerAuthModule } from 'src/modules/auth/seller-auth/seller-auth.module';
import { SellerModule } from 'src/modules/seller/seller.module';
import { ShopModule } from 'src/modules/shop/shop/shop.module';
import { SupportModule } from 'src/modules/support/support.module';
import { ShiftModule } from 'src/modules/shift/shift.module';

@Module({
  imports: [
    forwardRef(() => SellerAuthModule),
    forwardRef(() => SellerModule),
    forwardRef(() => ShopModule),
    forwardRef(() => SupportModule),
    forwardRef(() => ShiftModule),

  ],
  providers: [TelegramSellerBotService],
  exports: [TelegramSellerBotService],
})
export class TelegramSellerBotModule {}