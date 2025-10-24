import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShiftSchema, Shift } from './shift.schema';
import { ShiftService } from './shift.service';
import { ShiftFacade } from './shift.facade';
import { SHIFT_PORT } from './shift.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Shift.name, schema: ShiftSchema }]),
  ],
  providers: [
    ShiftService,
    ShiftFacade,
    { provide: SHIFT_PORT, useExisting: ShiftFacade }
  ],
  exports: [SHIFT_PORT],
})
export class ShiftModule {}