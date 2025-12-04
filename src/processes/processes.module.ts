import { Module } from '@nestjs/common';
import { OrderProcessModule } from './order/order-process.module';
import { RegistrationModule } from './registration/registration.module';
import { FinanceProcessModule } from './finance/finance-process.module';
import { ShopProcessModule } from './shop/shop-process.module';
import { InventoryProcessModule } from './inventory/inventory-process.module';

@Module({
  imports: [
    OrderProcessModule,
    RegistrationModule,
    FinanceProcessModule,
    ShopProcessModule,
    InventoryProcessModule,
  ],
  exports: [
    OrderProcessModule,
    RegistrationModule,
    FinanceProcessModule,
    ShopProcessModule,
    InventoryProcessModule,
  ],
})
export class ProcessesModule {}