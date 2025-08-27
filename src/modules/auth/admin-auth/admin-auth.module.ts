import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminLoginCodeSchema } from './admin-login-code.schema';
import { AdminAuthGateway } from './admin-auth.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'AdminLoginCode', schema: AdminLoginCodeSchema }])
  ],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminAuthGateway],
  exports: [AdminAuthService, AdminAuthGateway],
})
export class AdminAuthModule {}