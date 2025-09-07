import { Module } from '@nestjs/common';

import { SellerAdminService } from './admin/seller.admin.service';
import { SellerService } from './seller/seller.service';
import { SellerController } from './seller/seller.controller';
import { SellerAdminController } from './admin/seller.admin.controller';
import { SellerSharedService } from './shared/seller.shared.service';
@Module({
  imports: [],
  controllers: [SellerController, SellerAdminController],
  providers: [SellerService, SellerAdminService, SellerSharedService],
  exports: [SellerSharedService],
})
export class SellerModule {}