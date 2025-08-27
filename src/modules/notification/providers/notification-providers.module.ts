// src/modules/notification/providers/notification-providers.module.ts
import { Module, forwardRef } from "@nestjs/common";
import { TelegramCustomerNotificationProvider } from "./telegram-customer-notification.provider";
import { TelegramSellerNotificationProvider } from "./telegram-seller-notification.provider";
import { TelegramEmployeeNotificationProvider } from "./telegram-employee-notification.provider";
import { TelegramAdminNotificationProvider } from './telegram-admin-notification.provider'
import { TelegramCustomerBotModule } from "src/modules/telegram/customer-bot/telegram-customer-bot.module";
import { TelegramSellerBotModule } from "src/modules/telegram/seller-bot/telegram-seller-bot.module";
import { TelegramEmployeeBotModule } from "src/modules/telegram/employee-bot/telegram-employee-bot.module";
import { TelegramAdminBotModule } from "src/modules/telegram/admin-bot/telegram-admin-bot.module";
@Module({
  imports: [
    forwardRef(() => TelegramCustomerBotModule),
    forwardRef(() => TelegramSellerBotModule),
    forwardRef(() => TelegramEmployeeBotModule),
    forwardRef(() => TelegramAdminBotModule),
  ],
  providers: [
    TelegramCustomerNotificationProvider,
    TelegramSellerNotificationProvider,
    TelegramEmployeeNotificationProvider,
    TelegramAdminNotificationProvider
  ],
  exports: [
    TelegramCustomerNotificationProvider,
    TelegramSellerNotificationProvider,
    TelegramEmployeeNotificationProvider,
    TelegramAdminNotificationProvider
  ],
})
export class NotificationProvidersModule {}