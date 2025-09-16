import { Module } from '@nestjs/common';

import { SellerAdminService } from './roles/admin/seller.admin.service';
import { SellerService } from './roles/seller/seller.service';
import { SellerController } from './roles/seller/seller.controller';
import { SellerAdminController } from './roles/admin/seller.admin.controller';
import { SellerSharedService } from './shared/seller.shared.service';
@Module({
  imports: [],
  controllers: [SellerController, SellerAdminController],
  providers: [SellerService, SellerAdminService, SellerSharedService],
  exports: [SellerSharedService],
})
export class SellerModule {}