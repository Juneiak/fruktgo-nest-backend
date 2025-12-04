import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Receiving, ReceivingSchema } from './receiving.schema';
import { ReceivingService } from './receiving.service';
import { RECEIVING_PORT } from './receiving.port';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Receiving.name, schema: ReceivingSchema },
    ]),
  ],
  providers: [
    {
      provide: RECEIVING_PORT,
      useClass: ReceivingService,
    },
  ],
  exports: [RECEIVING_PORT],
})
export class ReceivingModule {}
