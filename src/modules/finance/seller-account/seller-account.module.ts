import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SellerAccountService } from './seller-account.service';
import { SellerAccountSchema } from './schemas/seller-account.schema';
import { WithdrawalRequestSchema } from './schemas/withdrawal-request.schema';
import { SellerAccountSellerController } from './seller/seller-account.seller.controller';
import { SellerAccountAdminController } from './admin/seller-account.admin.controller';
import { SellerAccountSellerService } from './seller/seller-account.seller.service';
import { SellerAccountAdminService } from './admin/seller-account.admin.service';
import { SellerAccountSharedService } from './shared/seller-account.shared.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'SellerAccount', schema: SellerAccountSchema },
      { name: 'WithdrawalRequest', schema: WithdrawalRequestSchema }
    ])
  ],
  controllers: [SellerAccountSellerController, SellerAccountAdminController],
  providers: [
    SellerAccountService,
    SellerAccountSellerService,
    SellerAccountAdminService,
    SellerAccountSharedService
  ],
  exports: [SellerAccountSharedService]
})
export class SellerAccountModule {}
