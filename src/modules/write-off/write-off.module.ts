import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WriteOff, WriteOffSchema } from './write-off.schema';
import { WriteOffService } from './write-off.service';
import { WRITE_OFF_PORT } from './write-off.port';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WriteOff.name, schema: WriteOffSchema },
    ]),
  ],
  providers: [
    {
      provide: WRITE_OFF_PORT,
      useClass: WriteOffService,
    },
  ],
  exports: [WRITE_OFF_PORT],
})
export class WriteOffModule {}
