import { Module } from '@nestjs/common';
import { ShopInventoryController } from './shop.inventory.controller';
import { ShopInventoryRoleService } from './shop.inventory.role.service';
import { InventoryProcessModule } from 'src/processes/inventory';
import { WriteOffModule } from 'src/modules/write-off';
import { ReceivingModule } from 'src/modules/receiving';
import { TransferModule } from 'src/modules/transfer';
import { InventoryAuditModule } from 'src/modules/inventory-audit';

@Module({
  imports: [
    InventoryProcessModule,
    WriteOffModule,
    ReceivingModule,
    TransferModule,
    InventoryAuditModule,
  ],
  controllers: [ShopInventoryController],
  providers: [ShopInventoryRoleService],
})
export class ShopInventoryApiModule {}
