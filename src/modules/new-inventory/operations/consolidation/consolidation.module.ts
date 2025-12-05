import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MixedBatch, MixedBatchSchema } from '../../batch/mixed-batch.schema';
import { ConsolidationService } from './consolidation.service';
import { CONSOLIDATION_PORT } from './consolidation.port';
import { BatchModule } from '../../batch';
import { BatchLocationModule } from '../../batch-location';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MixedBatch.name, schema: MixedBatchSchema },
    ]),
    BatchModule,
    BatchLocationModule,
  ],
  providers: [
    ConsolidationService,
    {
      provide: CONSOLIDATION_PORT,
      useExisting: ConsolidationService,
    },
  ],
  exports: [CONSOLIDATION_PORT, ConsolidationService],
})
export class ConsolidationModule {}
