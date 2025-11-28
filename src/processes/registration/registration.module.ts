import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RegistrationOrchestrator, REGISTRATION_ORCHESTRATOR } from './registration.orchestrator';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
      }),
    }),
  ],
  providers: [
    RegistrationOrchestrator,
    {
      provide: REGISTRATION_ORCHESTRATOR,
      useExisting: RegistrationOrchestrator,
    },
  ],
  exports: [REGISTRATION_ORCHESTRATOR],
})
export class RegistrationModule {}
