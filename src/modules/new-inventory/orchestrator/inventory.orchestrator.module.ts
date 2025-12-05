import { Module } from '@nestjs/common';
import {
  InventoryOrchestrator,
  INVENTORY_ORCHESTRATOR,
} from './inventory.orchestrator';
import { BatchModule } from '../batch';
import { BatchLocationModule } from '../batch-location';
import { ReceivingModule } from '../operations/receiving';
import { TransferModule } from '../operations/transfer';
import { WriteOffModule } from '../operations/write-off';
import { ReturnModule } from '../operations/return';
import { AuditModule } from '../operations/audit';
import { MovementModule } from '../movement';
import { ReservationModule } from '../reservation';
import { AlertsModule } from '../alerts';
import { NewInventoryCoreModule } from '../core';

@Module({
  imports: [
    NewInventoryCoreModule,
    BatchModule,
    BatchLocationModule,
    ReceivingModule,
    TransferModule,
    WriteOffModule,
    ReturnModule,
    AuditModule,
    MovementModule,
    ReservationModule,
    AlertsModule,
  ],
  providers: [
    InventoryOrchestrator,
    {
      provide: INVENTORY_ORCHESTRATOR,
      useExisting: InventoryOrchestrator,
    },
  ],
  exports: [INVENTORY_ORCHESTRATOR, InventoryOrchestrator],
})
export class InventoryOrchestratorModule {}
