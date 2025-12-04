import { Module } from '@nestjs/common';

// Orchestrator
import { InventoryProcessOrchestrator } from './inventory-process.orchestrator';

// Domain Modules
import { WriteOffModule } from 'src/modules/write-off';
import { ReceivingModule } from 'src/modules/receiving';
import { TransferModule } from 'src/modules/transfer';
import { InventoryAuditModule } from 'src/modules/inventory-audit';
import { ShopProductModule } from 'src/modules/shop-product';
import { StockMovementModule } from 'src/modules/stock-movement';

export const INVENTORY_PROCESS_ORCHESTRATOR = Symbol('INVENTORY_PROCESS_ORCHESTRATOR');

@Module({
  imports: [
    WriteOffModule,
    ReceivingModule,
    TransferModule,
    InventoryAuditModule,
    ShopProductModule,
    StockMovementModule,
  ],
  providers: [
    InventoryProcessOrchestrator,
    {
      provide: INVENTORY_PROCESS_ORCHESTRATOR,
      useExisting: InventoryProcessOrchestrator,
    },
  ],
  exports: [
    InventoryProcessOrchestrator,
    INVENTORY_PROCESS_ORCHESTRATOR,
  ],
})
export class InventoryProcessModule {}
