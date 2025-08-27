import { Module, forwardRef } from '@nestjs/common';
import { NotificationService } from './notification.service'

import { TelegramCustomerNotificationProvider } from './providers/telegram-customer-notification.provider';
import { TelegramSellerNotificationProvider } from './providers/telegram-seller-notification.provider';
import { TelegramEmployeeNotificationProvider } from './providers/telegram-employee-notification.provider';
import { TelegramAdminNotificationProvider } from './providers/telegram-admin-notification.provider';
import { NotificationProvidersModule } from './providers/notification-providers.module';
import { SupportModule } from 'src/modules/support/support.module';
import { EmployeeModule } from 'src/modules/employee/employee.module';

@Module({
  imports: [
    forwardRef(() => NotificationProvidersModule),
    forwardRef(() => SupportModule),
    forwardRef(() => EmployeeModule),
  ],
  providers: [
    NotificationService,
    {
      provide: "CUSTOMER_NOTIFICATION_PROVIDER",
      useExisting: TelegramCustomerNotificationProvider
    },
    {
      provide: "SELLER_NOTIFICATION_PROVIDER",
      useExisting: TelegramSellerNotificationProvider
    },
    {
      provide: "EMPLOYEE_NOTIFICATION_PROVIDER",
      useExisting: TelegramEmployeeNotificationProvider
    },
    {
      provide: "ADMIN_NOTIFICATION_PROVIDER",
      useExisting: TelegramAdminNotificationProvider
    },
  ],
  exports: [
    NotificationService
  ],
})
export class NotificationModule {}