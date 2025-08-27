import { Module, forwardRef } from '@nestjs/common';
import { TelegramCustomerBotService } from './telegram-customer-bot.service';
import { CustomerAuthModule } from 'src/modules/auth/customer-auth/customer-auth.module';
import { CustomerModule } from 'src/modules/customer/customer.module';
import { OrderModule } from 'src/modules/order/order.module';
import { SupportModule } from 'src/modules/support/support.module';
@Module({
  imports: [
    forwardRef(() => CustomerAuthModule),
    forwardRef(() => CustomerModule),
    forwardRef(() => OrderModule),
    forwardRef(() => SupportModule)
  ],
  providers: [TelegramCustomerBotService],
  exports: [TelegramCustomerBotService],
})
export class TelegramCustomerBotModule {}