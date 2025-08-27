// src/modules/notification/providers/telegram-customer-notification.provider.ts
import { Injectable } from "@nestjs/common";
import { TelegramNotificationResponseDto } from "src/common/dtos";
import { TelegramAdminBotService } from "src/modules/telegram/admin-bot/telegram-admin-bot.service";

export interface INotificationToAdminProvider {
  notifyAdmin(message: string): Promise<TelegramNotificationResponseDto>;
  
}

@Injectable()
export class TelegramAdminNotificationProvider implements INotificationToAdminProvider {
  constructor(private readonly telegramService: TelegramAdminBotService) {}

  async notifyAdmin(message: string): Promise<TelegramNotificationResponseDto> {
    return this.telegramService.notifyAdmin(message);
  }

}