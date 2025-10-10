import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerSchema, Customer } from './customer.schema';
import { CustomerService } from './customer.service';
import { CustomerFacade } from './customer.facade';
import { CUSTOMER_PORT } from './customer.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }]),
  ],
  providers: [
    CustomerService,
    CustomerFacade,
    { provide: CUSTOMER_PORT, useExisting: CustomerFacade }
  ],
  exports: [CUSTOMER_PORT],
})
export class CustomerModule {}