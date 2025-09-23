import { Module, forwardRef } from '@nestjs/common';
import { TelegramAdminBotService } from './telegram-admin-bot.service';
import { AdminAuthModule } from 'src/modules/auth/admin-auth/admin-auth.module';
import { AdminModule } from 'src/modules/platform/platform.module';
@Module({
  imports: [
    forwardRef(() => AdminAuthModule),
    forwardRef(() => AdminModule),
  ],
  providers: [TelegramAdminBotService],
  exports: [TelegramAdminBotService],
})
export class TelegramAdminBotModule {}