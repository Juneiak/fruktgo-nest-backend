import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoginCode, LoginCodeSchema } from './login-code.schema';
import { AuthService } from './auth.service';
import { AUTH_PORT } from './auth.port';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LoginCode.name, schema: LoginCodeSchema },
    ]),
  ],
  providers: [
    AuthService,
    {
      provide: AUTH_PORT,
      useExisting: AuthService,
    },
  ],
  exports: [AUTH_PORT],
})
export class LoginCodeModule {}
