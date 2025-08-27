import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SellerAccountControllerForAdmin, SellerAccountControllerForSeller } from './seller-account.controllers';
import { SellerAccountService } from './seller-account.service';
import { SellerAccountSchema } from './schemas/seller-account.schema';
import { WithdrawalRequestSchema } from './schemas/withdrawal-request.schema';
import { SellerAccountPublicService } from './seller-account.public.service';
import { SellerAccountServiceForSeller, SellerAccountServiceForAdmin } from './seller-account.role-services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'SellerAccount', schema: SellerAccountSchema },
      { name: 'WithdrawalRequest', schema: WithdrawalRequestSchema }
    ])
  ],
  controllers: [SellerAccountControllerForSeller, SellerAccountControllerForAdmin],
  providers: [
    SellerAccountService,
    SellerAccountServiceForSeller,
    SellerAccountServiceForAdmin,
    SellerAccountPublicService
  ],
  exports: [SellerAccountPublicService]
})
export class SellerAccountModule {}
