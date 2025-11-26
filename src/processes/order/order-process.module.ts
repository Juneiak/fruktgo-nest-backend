import { Module } from '@nestjs/common';

// Orchestrator
import { OrderProcessOrchestrator } from './order-process.orchestrator';

// Domain Modules
import { OrderModule } from 'src/modules/order';
import { ShopModule } from 'src/modules/shop';
import { ShiftModule } from 'src/modules/shift';
import { CustomerModule } from 'src/modules/customer';
import { CartModule } from 'src/modules/cart';
import { ShopProductModule } from 'src/modules/shop-product';

export const ORDER_PROCESS_ORCHESTRATOR = Symbol('ORDER_PROCESS_ORCHESTRATOR');

@Module({
  imports: [
    // Domain modules provide their ports
    OrderModule,
    ShopModule,
    ShiftModule,
    CustomerModule,
    CartModule,
    ShopProductModule,
  ],
  providers: [
    OrderProcessOrchestrator,
    {
      provide: ORDER_PROCESS_ORCHESTRATOR,
      useExisting: OrderProcessOrchestrator,
    },
  ],
  exports: [
    OrderProcessOrchestrator,
    ORDER_PROCESS_ORCHESTRATOR,
  ],
})
export class OrderProcessModule {}
