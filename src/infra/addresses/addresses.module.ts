import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Address, AddressSchema } from './address.schema';
import { AddressesService } from './addresses.service';
import { AddressesFacade } from './addresses.facade';
import { ADDRESSES_PORT } from './addresses.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Address.name, schema: AddressSchema }]),
  ],
  providers: [
    AddressesService,
    AddressesFacade,
    { provide: ADDRESSES_PORT, useExisting: AddressesFacade }
  ],
  exports: [ADDRESSES_PORT],
})
export class AddressesModule {}
