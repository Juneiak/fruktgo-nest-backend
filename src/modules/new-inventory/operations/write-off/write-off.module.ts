import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WriteOff, WriteOffSchema } from './write-off.schema';
import { WriteOffService } from './write-off.service';
import { WRITE_OFF_PORT } from './write-off.port';
import { BatchModule } from '../../batch';
import { BatchLocationModule } from '../../batch-location';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WriteOff.name, schema: WriteOffSchema },
    ]),
    BatchModule,
    BatchLocationModule,
  ],
  providers: [
    WriteOffService,
    {
      provide: WRITE_OFF_PORT,
      useExisting: WriteOffService,
    },
  ],
  exports: [WRITE_OFF_PORT, WriteOffService],
})
export class WriteOffModule {}
