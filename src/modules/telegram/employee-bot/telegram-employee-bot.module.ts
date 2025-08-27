import { Module, forwardRef } from '@nestjs/common';
import { TelegramEmployeeBotService } from './telegram-employee-bot.service'
import { EmployeeAuthModule } from 'src/modules/auth/employee-auth/employee-auth.module';
import { EmployeeModule } from 'src/modules/employee/employee.module';

@Module({
  imports: [
    forwardRef(() => EmployeeAuthModule),
    forwardRef(() => EmployeeModule)
  ],
  providers: [TelegramEmployeeBotService],
  exports: [TelegramEmployeeBotService],
})
export class TelegramEmployeeBotModule {}