import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  InventoryProduct,
  InventoryProductSchema,
} from './inventory-product.schema';
import { InventoryProductService } from './inventory-product.service';
import { INVENTORY_PRODUCT_PORT } from './inventory-product.port';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InventoryProduct.name, schema: InventoryProductSchema },
    ]),
  ],
  providers: [
    InventoryProductService,
    {
      provide: INVENTORY_PRODUCT_PORT,
      useExisting: InventoryProductService,
    },
  ],
  exports: [INVENTORY_PRODUCT_PORT, InventoryProductService],
})
export class InventoryProductModule {}
