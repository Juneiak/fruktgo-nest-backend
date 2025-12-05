import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Receiving, ReceivingSchema } from './receiving.schema';
import { ReceivingService } from './receiving.service';
import { RECEIVING_PORT } from './receiving.port';
import { BatchModule } from '../../batch';
import { BatchLocationModule } from '../../batch-location';
import { ShelfLifeCalculatorModule } from '../../core';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Receiving.name, schema: ReceivingSchema },
    ]),
    BatchModule,
    BatchLocationModule,
    ShelfLifeCalculatorModule,
  ],
  providers: [
    ReceivingService,
    {
      provide: RECEIVING_PORT,
      useExisting: ReceivingService,
    },
  ],
  exports: [RECEIVING_PORT, ReceivingService],
})
export class ReceivingModule {}
