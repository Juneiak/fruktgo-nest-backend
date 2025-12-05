import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Batch, BatchSchema } from './batch.schema';
import { BatchService } from './batch.service';
import { BATCH_PORT } from './batch.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Batch.name, schema: BatchSchema }]),
  ],
  providers: [
    BatchService,
    {
      provide: BATCH_PORT,
      useExisting: BatchService,
    },
  ],
  exports: [BATCH_PORT, BatchService],
})
export class BatchModule {}
