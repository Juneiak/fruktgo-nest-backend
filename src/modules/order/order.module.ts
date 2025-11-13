import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderSchema, Order } from './order.schema';
import { OrderService } from './order.service';
import { ORDER_PORT } from './order.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  providers: [
    OrderService,
    { provide: ORDER_PORT, useExisting: OrderService }
  ],
  exports: [ORDER_PORT],
})
export class OrderModule {}