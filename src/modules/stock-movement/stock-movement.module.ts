import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StockMovement, StockMovementSchema } from './stock-movement.schema';
import { StockMovementService } from './stock-movement.service';
import { STOCK_MOVEMENT_PORT } from './stock-movement.port';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StockMovement.name, schema: StockMovementSchema },
    ]),
  ],
  providers: [
    {
      provide: STOCK_MOVEMENT_PORT,
      useClass: StockMovementService,
    },
  ],
  exports: [STOCK_MOVEMENT_PORT],
})
export class StockMovementModule {}
