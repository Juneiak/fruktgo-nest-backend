import { Module } from '@nestjs/common';

import { SellerService } from './application/seller.service';
import { SellerSchema } from './seller.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Seller } from './seller.schema';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: Seller.name, schema: SellerSchema }]),

  ],
  providers: [SellerService],
  exports: [SellerService],
})
export class SellerModule {}