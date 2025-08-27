import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Penalty, PenaltySchema } from './penalty.schema';
import { PenaltyControllerForAdmin, PenaltyControllerForSeller } from './penalty.controllers';
import { PenaltyServiceForAdmin, PenaltyServiceForSeller } from './penalty.role-services';
import { PenaltyService } from './penalty.service';
import { PenaltyPublicService } from './penalty.public.service';
import { ShopAccountModule } from '../shop-account/shop-account.module';
import { ShopAccountSchema } from '../shop-account/schemas/shop-account.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Penalty', schema: PenaltySchema },
      { name: 'ShopAccount', schema: ShopAccountSchema },
    ]),
    ShopAccountModule,
  ],
  controllers: [PenaltyControllerForAdmin, PenaltyControllerForSeller],
  providers: [
    PenaltyServiceForAdmin,
    PenaltyServiceForSeller,
    PenaltyService,
    PenaltyPublicService,
  ],
  exports: [PenaltyPublicService]
})
export class PenaltyModule {}
