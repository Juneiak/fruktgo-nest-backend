import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SellerForAdminService } from './for-admin/seller-for-admin.service';
import { SellerForSellerService } from './for-seller/seller-for-seller.service';
import { SellerForSellerController } from './for-seller/seller-for-seller.controller';
import { SellerForAdminController } from './for-admin/seller-for-admin.controller';

@Module({
  imports: [],
  controllers: [SellerForSellerController, SellerForAdminController],
  providers: [SellerForSellerService, SellerForAdminService],
  exports: [SellerForSellerService],
})
export class SellerModule {}