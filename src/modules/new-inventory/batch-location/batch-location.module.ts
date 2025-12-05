import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BatchLocation, BatchLocationSchema } from './batch-location.schema';
import { BatchLocationService } from './batch-location.service';
import { BATCH_LOCATION_PORT } from './batch-location.port';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BatchLocation.name, schema: BatchLocationSchema },
    ]),
  ],
  providers: [
    BatchLocationService,
    {
      provide: BATCH_LOCATION_PORT,
      useExisting: BatchLocationService,
    },
  ],
  exports: [BATCH_LOCATION_PORT, BatchLocationService],
})
export class BatchLocationModule {}
