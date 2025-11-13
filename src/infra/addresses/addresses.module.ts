import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Address, AddressSchema } from './address.schema';
import { AddressesService } from './addresses.service';
import { ADDRESSES_PORT } from './addresses.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Address.name, schema: AddressSchema }]),
  ],
  providers: [
    AddressesService,
    { provide: ADDRESSES_PORT, useExisting: AddressesService }
  ],
  exports: [ADDRESSES_PORT],
})
export class AddressesModule {}
