import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reservation, ReservationSchema } from './reservation.schema';
import { ReservationService } from './reservation.service';
import { RESERVATION_PORT } from './reservation.port';
import { BatchLocationModule } from '../batch-location';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
    ]),
    BatchLocationModule,
  ],
  providers: [
    ReservationService,
    {
      provide: RESERVATION_PORT,
      useExisting: ReservationService,
    },
  ],
  exports: [RESERVATION_PORT, ReservationService],
})
export class ReservationModule {}
