import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Refund, RefundSchema } from './refund.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Refund.name, schema: RefundSchema }
    ])
  ],
  controllers: [],
  providers: [],
  exports: []
})
export class RefundModule {}
