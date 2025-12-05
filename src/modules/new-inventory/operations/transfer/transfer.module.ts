import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transfer, TransferSchema } from './transfer.schema';
import { TransferService } from './transfer.service';
import { TRANSFER_PORT } from './transfer.port';
import { BatchModule } from '../../batch';
import { BatchLocationModule } from '../../batch-location';
import { ShelfLifeCalculatorModule } from '../../core';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transfer.name, schema: TransferSchema },
    ]),
    BatchModule,
    BatchLocationModule,
    ShelfLifeCalculatorModule,
  ],
  providers: [
    TransferService,
    {
      provide: TRANSFER_PORT,
      useExisting: TransferService,
    },
  ],
  exports: [TRANSFER_PORT, TransferService],
})
export class TransferModule {}
