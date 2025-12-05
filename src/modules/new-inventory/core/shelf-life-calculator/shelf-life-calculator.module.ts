import { Module } from '@nestjs/common';
import { ShelfLifeCalculatorService } from './shelf-life-calculator.service';

@Module({
  providers: [ShelfLifeCalculatorService],
  exports: [ShelfLifeCalculatorService],
})
export class ShelfLifeCalculatorModule {}
