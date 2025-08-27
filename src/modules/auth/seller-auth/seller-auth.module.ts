import { Module } from '@nestjs/common';
import { SellerAuthController } from './seller-auth.controller';
import { SellerAuthService } from './seller-auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ShopLoginCodeSchema } from './shop-login-code.schema'
import { SellerLoginCodeSchema } from './seller-login-code.schema'
import { SellerAuthGateway } from './seller-auth.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'ShopLoginCode', schema: ShopLoginCodeSchema }]),
    MongooseModule.forFeature([{ name: 'SellerLoginCode', schema: SellerLoginCodeSchema }]),
  ],
  controllers: [SellerAuthController],
  providers: [SellerAuthService, SellerAuthGateway],
  exports: [SellerAuthService, SellerAuthGateway],
})
export class SellerAuthModule {}