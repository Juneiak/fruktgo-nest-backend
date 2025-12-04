import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryAudit, InventoryAuditSchema } from './inventory-audit.schema';
import { InventoryAuditService } from './inventory-audit.service';
import { INVENTORY_AUDIT_PORT } from './inventory-audit.port';
import { ShopProductModule } from 'src/modules/shop-product';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: InventoryAudit.name, schema: InventoryAuditSchema }]),
    ShopProductModule,
  ],
  providers: [
    InventoryAuditService,
    { provide: INVENTORY_AUDIT_PORT, useExisting: InventoryAuditService },
  ],
  exports: [INVENTORY_AUDIT_PORT],
})
export class InventoryAuditModule {}
