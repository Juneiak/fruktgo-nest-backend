import { Module, forwardRef } from '@nestjs/common';
import { EmployeeAuthController } from './employee-auth.controller';
import { EmployeeAuthService } from './employee-auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeLoginCodeSchema } from './employee-login-code.schema';
import { EmployeeAuthGateway } from './employee-auth.gateway';
import { NotificationModule } from 'src/infra/notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'EmployeeLoginCode', schema: EmployeeLoginCodeSchema },
    ]),
    forwardRef(() => NotificationModule),
  ],
  controllers: [EmployeeAuthController],
  providers: [EmployeeAuthService, EmployeeAuthGateway],
  exports: [EmployeeAuthService, EmployeeAuthGateway],
})
export class EmployeeAuthModule {}