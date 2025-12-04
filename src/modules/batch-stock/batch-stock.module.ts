import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductBatchModule } from 'src/modules/product-batch';
import { BatchStock, BatchStockSchema } from './batch-stock.schema';
import { BatchStockService } from './batch-stock.service';
import { BATCH_STOCK_PORT } from './batch-stock.port';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BatchStock.name, schema: BatchStockSchema },
    ]),
    ProductBatchModule,
  ],
  providers: [
    BatchStockService,
    {
      provide: BATCH_STOCK_PORT,
      useExisting: BatchStockService,
    },
  ],
  exports: [BATCH_STOCK_PORT],
})
export class BatchStockModule {}
