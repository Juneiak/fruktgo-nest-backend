import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  ShopLogSchema,
  OrderLogSchema,
  ProductLogSchema,
  SellerLogSchema,
  CustomerLogSchema,
  EmployeeLogSchema,
  ShiftLogSchema,
  ShopProductLogSchema,
  ShopAccountLogSchema,
  SellerAccountLogSchema,
} from './logs.schemas';
import {LogsService} from './logs.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'ShopLog', schema: ShopLogSchema },
      { name: 'ShopProductLog', schema: ShopProductLogSchema },
      { name: 'ShiftLog', schema: ShiftLogSchema },
      { name: 'OrderLog', schema: OrderLogSchema },
      { name: 'ProductLog', schema: ProductLogSchema },
      { name: 'SellerLog', schema: SellerLogSchema },
      { name: 'CustomerLog', schema: CustomerLogSchema },
      { name: 'EmployeeLog', schema: EmployeeLogSchema },
      { name: 'ShopAccountLog', schema: ShopAccountLogSchema },
      { name: 'SellerAccountLog', schema: SellerAccountLogSchema },
    ]),
  ],
  controllers: [],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}