import { Module } from '@nestjs/common';
import { OrderProcessModule } from './order/order-process.module';

@Module({
  imports: [
    OrderProcessModule,
  ],
  exports: [
    OrderProcessModule,
  ],
})
export class ProcessesModule {}