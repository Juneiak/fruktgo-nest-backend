import { Module } from '@nestjs/common';
import { SellerWarehousesController } from './seller.warehouses.controller';
import { SellerWarehousesRoleService } from './seller.warehouses.role.service';
import { WarehouseModule } from 'src/modules/warehouse';
import { WarehouseProductModule } from 'src/modules/warehouse-product';

@Module({
  imports: [
    WarehouseModule,
    WarehouseProductModule,
  ],
  controllers: [SellerWarehousesController],
  providers: [SellerWarehousesRoleService],
})
export class SellerWarehousesApiModule {}
