import { Module, forwardRef } from '@nestjs/common';

// Orchestrator
import { OrderProcessOrchestrator } from './order-process.orchestrator';

// Domain Modules
import { OrderModule } from 'src/modules/order';
import { ShopModule } from 'src/modules/shop';
import { ShiftModule } from 'src/modules/shift';
import { CustomerModule } from 'src/modules/customer';
import { CartModule } from 'src/modules/cart';
import { ShopProductModule } from 'src/modules/shop-product';
import { StockMovementModule } from 'src/modules/stock-movement';

// Process Modules
import { FinanceProcessModule } from 'src/processes/finance';

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
    StockMovementModule,
    // Finance process for recording order income
    forwardRef(() => FinanceProcessModule),
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
