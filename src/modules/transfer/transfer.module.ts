import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transfer, TransferSchema } from './transfer.schema';
import { TransferService } from './transfer.service';
import { TRANSFER_PORT } from './transfer.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Transfer.name, schema: TransferSchema }]),
  ],
  providers: [
    TransferService,
    { provide: TRANSFER_PORT, useExisting: TransferService },
  ],
  exports: [TRANSFER_PORT],
})
export class TransferModule {}
