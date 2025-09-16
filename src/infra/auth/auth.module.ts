import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TypeGuard } from '../../common/guards/type.guard';
import { EmployeeAuthGuard } from '../../common/guards/employee-auth.guard';


@Global()
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, TypeGuard, EmployeeAuthGuard],
  exports: [
    JwtAuthGuard,
    TypeGuard,
    JwtModule,
    PassportModule,
    EmployeeAuthGuard
  ],
})
export class AuthModule {}