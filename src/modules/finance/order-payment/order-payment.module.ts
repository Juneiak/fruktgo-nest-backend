import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderPayment, OrderPaymentSchema } from './order-payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderPayment.name, schema: OrderPaymentSchema }
    ])
  ],
  controllers: [],
  providers: [],
  exports: []
})
export class OrderPaymentModule {}
