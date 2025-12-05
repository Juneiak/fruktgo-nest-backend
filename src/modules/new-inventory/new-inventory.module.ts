import { Module } from '@nestjs/common';
import { NewInventoryCoreModule } from './core';
import { BatchModule } from './batch';
import { BatchLocationModule } from './batch-location';
import {
  ReceivingModule,
  TransferModule,
  WriteOffModule,
  ReturnModule,
} from './operations';
import { MovementModule } from './movement';
import { ReservationModule } from './reservation';
import { AuditModule } from './operations/audit';
import { AlertsModule } from './alerts';
import { InventoryOrchestratorModule } from './orchestrator';
import {
  ProductTemplateModule,
  StorageLocationModule,
  StorefrontModule,
} from './entities';
import { PricingModule } from './pricing';
import { ConsolidationModule } from './operations/consolidation';

/**
 * New Inventory Module
 *
 * Полная замена старых модулей складского учёта:
 * - warehouse → entities/storage-location
 * - warehouse-product → entities/storefront
 * - batch-stock → batch-location
 * - receiving → operations/receiving
 * - transfer → operations/transfer
 * - write-off → operations/write-off
 * - inventory-audit → operations/audit
 *
 * Фазы реализации:
 * 1. ✅ Core (storage-preset, storage-conditions, shelf-life-calculator)
 * 2. ✅ Batch + BatchLocation
 * 3. ✅ Operations (Receiving, Transfer, WriteOff)
 * 4. ✅ Return
 * 5. ✅ Movement + Reservation
 * 6. ✅ Audit + Alerts
 * 7. ✅ Orchestrator
 * 8. ✅ Entities (ProductTemplate, StorageLocation, Storefront)
 * 9. ✅ Pricing
 * 10. ✅ Consolidation (auto-mixing)
 */
@Module({
  imports: [
    NewInventoryCoreModule,
    BatchModule,
    BatchLocationModule,
    ReceivingModule,
    TransferModule,
    WriteOffModule,
    ReturnModule,
    MovementModule,
    ReservationModule,
    AuditModule,
    AlertsModule,
    InventoryOrchestratorModule,
    ProductTemplateModule,
    StorageLocationModule,
    StorefrontModule,
    PricingModule,
    ConsolidationModule,
  ],
  exports: [
    NewInventoryCoreModule,
    BatchModule,
    BatchLocationModule,
    ReceivingModule,
    TransferModule,
    WriteOffModule,
    ReturnModule,
    MovementModule,
    ReservationModule,
    AuditModule,
    AlertsModule,
    InventoryOrchestratorModule,
    ProductTemplateModule,
    StorageLocationModule,
    StorefrontModule,
    PricingModule,
    ConsolidationModule,
  ],
})
export class NewInventoryModule {}
