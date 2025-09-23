// src/modules/notification/providers/telegram-seller-notification.provider.ts
import { Injectable } from "@nestjs/common";
import { TelegramSellerBotService } from "src/modules/telegram/seller-bot/telegram-seller-bot.service";
import { TelegramNotificationResponseDto } from "src/common/dtos";
import { Issue } from "src/modules/support/issue.schema";
import { Shift } from "src/modules/shift/shift.schema";

export interface INotificationToSellerProvider {
  notifySeller(telegramId: number, message: string, options?: {reply_markup?: any}): Promise<TelegramNotificationResponseDto>;
  
  notifySellerAboutShiftUpdate(
    telegramId: number, 
    shift: Shift,
    haveOpened: boolean
  ): Promise<TelegramNotificationResponseDto>;
  
  notifySellerAboutIssueUpdate(
    telegramId: number, 
    issue: Issue
  ): Promise<TelegramNotificationResponseDto>;
}

@Injectable()
export class TelegramSellerNotificationProvider implements INotificationToSellerProvider {
  constructor(private readonly telegramService: TelegramSellerBotService) {}

  async notifySeller(
    telegramId: number, 
    message: string, 
    options?: {reply_markup?: any}
  ): Promise<TelegramNotificationResponseDto> {
    return this.telegramService.notifySeller(telegramId, message, options);
  }
  
  async notifySellerAboutShiftUpdate(
    telegramId: number, 
    shift: Shift,
    haveOpened: boolean
  ): Promise<TelegramNotificationResponseDto> {
    return this.telegramService.notifySellerAboutShiftUpdate(telegramId, shift, haveOpened);
  }
  
  async notifySellerAboutIssueUpdate(
    telegramId: number, 
    issue: Issue
  ): Promise<TelegramNotificationResponseDto> {
    return this.telegramService.notifySellerAboutIssueUpdate(telegramId, issue);
  }
}