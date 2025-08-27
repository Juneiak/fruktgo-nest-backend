// src/modules/notification/providers/telegram-employee-notification.provider.ts
import { Injectable } from "@nestjs/common";
import { TelegramEmployeeBotService } from "src/modules/telegram/employee-bot/telegram-employee-bot.service";
import { TelegramNotificationResponseDto } from "src/common/dtos";
import { Order } from "src/modules/order/order.schema";
import { EmployeeLoginCode } from "src/modules/auth/employee-auth/employee-login-code.schema";

export interface INotificationToEmployeeProvider {
  notifyEmployee(telegramId: number, message: string, options?: {reply_markup?: any}): Promise<TelegramNotificationResponseDto>;
  
  notifyEmployeeAboutNewOrder(
    telegramId: number, 
    order: Order
  ): Promise<TelegramNotificationResponseDto>;

  notifyEmployeeAboutLoginToShop(
    telegramId: number,
    loginCode: EmployeeLoginCode
  ): Promise<TelegramNotificationResponseDto>;
}

@Injectable()
export class TelegramEmployeeNotificationProvider implements INotificationToEmployeeProvider {
  constructor(private readonly telegramService: TelegramEmployeeBotService) {}

  async notifyEmployee(
    telegramId: number, 
    message: string, 
    options?: {reply_markup?: any}
  ): Promise<TelegramNotificationResponseDto> {
    return this.telegramService.notifyEmployee(telegramId, message, options);
  }
  
  async notifyEmployeeAboutNewOrder(
    telegramId: number, 
    order: Order
  ): Promise<TelegramNotificationResponseDto> {
    return this.telegramService.notifyEmployeeAboutNewOrder(telegramId, order);
  }
  
  async notifyEmployeeAboutNewRequestFromSeller(
    telegramId: number,
    requestToEmployeeId: string
  ): Promise<TelegramNotificationResponseDto> {
    return this.telegramService.notifyEmployeeAboutNewRequestFromSeller(telegramId, requestToEmployeeId);
  }

  async notifyEmployeeAboutLoginToShop(
    telegramId: number,
    loginCode: EmployeeLoginCode
  ): Promise<TelegramNotificationResponseDto> {
    return this.telegramService.notifyEmployeeAboutLoginToShop(telegramId, loginCode);
  }
}