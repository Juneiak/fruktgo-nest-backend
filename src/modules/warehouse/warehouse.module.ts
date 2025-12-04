import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AddressesModule } from 'src/infra/addresses';
import { Warehouse, WarehouseSchema } from './warehouse.schema';
import { WarehouseService } from './warehouse.service';
import { WAREHOUSE_PORT } from './warehouse.port';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Warehouse.name, schema: WarehouseSchema },
    ]),
    AddressesModule,
  ],
  providers: [
    WarehouseService,
    {
      provide: WAREHOUSE_PORT,
      useExisting: WarehouseService,
    },
  ],
  exports: [WAREHOUSE_PORT],
})
export class WarehouseModule {}
