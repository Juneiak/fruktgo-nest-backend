import { Module } from '@nestjs/common';
import { SellerService } from './seller.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SellerSchema, Seller } from './seller.schema';
import { SELLER_PORT } from './seller.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Seller.name, schema: SellerSchema }]),
  ],
  providers: [
    SellerService,
    { provide: SELLER_PORT, useExisting: SellerService },
  ],
  exports: [SELLER_PORT],
})
export class SellerModule {}