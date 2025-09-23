import { Module } from '@nestjs/common';

import { SellerAdminService } from './roles/admin/seller.admin.service';
import { SellerService } from './roles/seller/seller.service';
import { SellerController } from './roles/seller/seller.controller';
import { SellerAdminController } from './roles/admin/seller.admin.controller';
import { SellerSchema } from './seller.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Seller } from './seller.schema';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: Seller.name, schema: SellerSchema }]),
  ],
  controllers: [SellerController, SellerAdminController],
  providers: [SellerService, SellerAdminService],
  exports: [SellerService],
})
export class SellerModule {}