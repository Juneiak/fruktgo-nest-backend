// src/modules/notification/providers/telegram-customer-notification.provider.ts
import { Injectable } from "@nestjs/common";
import { TelegramNotificationResponseDto } from "src/common/dtos";
import { Issue } from "src/modules/issue/issue.schema";
import { Order } from "src/modules/order/order.schema";
import { TelegramCustomerBotService } from "src/modules/telegram/customer-bot/telegram-customer-bot.service";

export interface INotificationToCustomerProvider {
  notifyCustomer(telegramId: number, message: string, options?: {reply_markup?: any}): Promise<TelegramNotificationResponseDto>;
  
  notifyCustomerAboutOrderUpdate(
    telegramId: number, 
    order: Order
  ): Promise<TelegramNotificationResponseDto>;
  
  notifyCustomerAboutIssueUpdate(
    telegramId: number, 
    issue: Issue
  ): Promise<TelegramNotificationResponseDto>;
}

@Injectable()
export class TelegramCustomerNotificationProvider implements INotificationToCustomerProvider {
  constructor(private readonly telegramService: TelegramCustomerBotService) {}

  async notifyCustomer(
    telegramId: number, 
    message: string, 
    options?: {reply_markup?: any}
  ): Promise<TelegramNotificationResponseDto> {
    return this.telegramService.notifyCustomer(telegramId, message, options);
  }
  
  async notifyCustomerAboutOrderUpdate(
    telegramId: number, 
    order: Order
  ): Promise<TelegramNotificationResponseDto> {
    return this.telegramService.notifyCustomerAboutOrderUpdate(telegramId, order);
  }
  
  async notifyCustomerAboutIssueUpdate(
    telegramId: number, 
    issue: Issue
  ): Promise<TelegramNotificationResponseDto> {
    return this.telegramService.notifyCustomerAboutIssueUpdate(telegramId, issue);
  }
}