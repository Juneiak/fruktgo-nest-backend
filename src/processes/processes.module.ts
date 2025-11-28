import { Module } from '@nestjs/common';
import { OrderProcessModule } from './order/order-process.module';
import { RegistrationModule } from './registration/registration.module';
import { FinanceProcessModule } from './finance/finance-process.module';
import { ShopProcessModule } from './shop/shop-process.module';

@Module({
  imports: [
    OrderProcessModule,
    RegistrationModule,
    FinanceProcessModule,
    ShopProcessModule,
  ],
  exports: [
    OrderProcessModule,
    RegistrationModule,
    FinanceProcessModule,
    ShopProcessModule,
  ],
})
export class ProcessesModule {}