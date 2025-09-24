import { Module } from '@nestjs/common';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerAuthGateway } from '../../../interface/ws/customer/auth/customer.auth.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomerLoginCodeSchema } from './customer-login-code.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'CustomerLoginCode', schema: CustomerLoginCodeSchema }])
  ],
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService, CustomerAuthGateway],
  exports: [CustomerAuthService, CustomerAuthGateway],
})
export class CustomerAuthModule {}