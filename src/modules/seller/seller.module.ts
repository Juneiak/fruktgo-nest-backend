import { Module } from '@nestjs/common';
import { SellerService } from './seller.service';
import { SellerSchema } from './seller.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Seller } from './seller.schema';
import { SellerFacade } from './seller.facade';
import { SELLER_PORT } from './seller.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Seller.name, schema: SellerSchema }]),
  ],
  providers: [
    SellerService,
    SellerFacade,
    { provide: SELLER_PORT, useExisting: SellerFacade }
  ],
  exports: [SELLER_PORT],
})
export class SellerModule {}