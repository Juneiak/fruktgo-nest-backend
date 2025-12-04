import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WarehouseProduct, WarehouseProductSchema } from './warehouse-product.schema';
import { WarehouseProductService } from './warehouse-product.service';
import { WAREHOUSE_PRODUCT_PORT } from './warehouse-product.port';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WarehouseProduct.name, schema: WarehouseProductSchema },
    ]),
  ],
  providers: [
    WarehouseProductService,
    {
      provide: WAREHOUSE_PRODUCT_PORT,
      useExisting: WarehouseProductService,
    },
  ],
  exports: [WAREHOUSE_PRODUCT_PORT],
})
export class WarehouseProductModule {}
