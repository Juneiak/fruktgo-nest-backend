import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Movement, MovementSchema } from './movement.schema';
import { MovementService } from './movement.service';
import { MOVEMENT_PORT } from './movement.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Movement.name, schema: MovementSchema }]),
  ],
  providers: [
    MovementService,
    {
      provide: MOVEMENT_PORT,
      useExisting: MovementService,
    },
  ],
  exports: [MOVEMENT_PORT, MovementService],
})
export class MovementModule {}
