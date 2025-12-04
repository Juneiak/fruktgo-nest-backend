import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductBatch, ProductBatchSchema } from './product-batch.schema';
import { ProductBatchService } from './product-batch.service';
import { PRODUCT_BATCH_PORT } from './product-batch.port';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductBatch.name, schema: ProductBatchSchema },
    ]),
  ],
  providers: [
    ProductBatchService,
    {
      provide: PRODUCT_BATCH_PORT,
      useExisting: ProductBatchService,
    },
  ],
  exports: [PRODUCT_BATCH_PORT],
})
export class ProductBatchModule {}
