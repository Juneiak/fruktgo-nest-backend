import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Return, ReturnSchema } from './return.schema';
import { ReturnService } from './return.service';
import { RETURN_PORT } from './return.port';
import { BatchModule } from '../../batch';
import { BatchLocationModule } from '../../batch-location';
import { WriteOffModule } from '../write-off';
import { ShelfLifeCalculatorModule } from '../../core';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Return.name, schema: ReturnSchema }]),
    BatchModule,
    BatchLocationModule,
    WriteOffModule,
    ShelfLifeCalculatorModule,
  ],
  providers: [
    ReturnService,
    {
      provide: RETURN_PORT,
      useExisting: ReturnService,
    },
  ],
  exports: [RETURN_PORT, ReturnService],
})
export class ReturnModule {}
