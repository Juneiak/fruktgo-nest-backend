// src/modules/notifications/notification.service.ts
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { TelegramNotificationResponseDto } from 'src/common/dtos';
import { TelegramCustomerNotificationProvider } from './providers/telegram-customer-notification.provider';
import { TelegramSellerNotificationProvider } from './providers/telegram-seller-notification.provider';
import { TelegramEmployeeNotificationProvider } from './providers/telegram-employee-notification.provider';
import { TelegramAdminNotificationProvider } from './providers/telegram-admin-notification.provider';
import { Order } from 'src/modules/order/order.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Issue } from 'src/modules/issue/issue.schema';
import { Shift } from 'src/modules/shift/shift.schema';
import { Employee } from 'src/modules/employee/employee.schema';
import { IssueUserType } from 'src/modules/issue/issue.schema';
import { Types } from 'mongoose';
import { RequestToEmployee } from 'src/modules/employee/request-to-employee.schema';
import { EmployeeLoginCode } from 'src/modules/auth/employee-auth/employee-login-code.schema';

@Injectable()
export class NotificationService {

  constructor(
    @InjectModel('Order') private orderModel: Model<Order>,
    @InjectModel('Issue') private issueModel: Model<Issue>,
    @InjectModel('Shift') private shiftModel: Model<Shift>,
    @InjectModel('Employee') private employeeModel: Model<Employee>,
    @InjectModel('RequestToEmployee') private requestToEmployeeModel: Model<RequestToEmployee>,
    
    @Inject("CUSTOMER_NOTIFICATION_PROVIDER")
    private readonly customerNotificationProvider: TelegramCustomerNotificationProvider,
    @Inject("SELLER_NOTIFICATION_PROVIDER")
    private readonly sellerNotificationProvider: TelegramSellerNotificationProvider,
    @Inject("EMPLOYEE_NOTIFICATION_PROVIDER")
    private readonly employeeNotificationProvider: TelegramEmployeeNotificationProvider,
    @Inject("ADMIN_NOTIFICATION_PROVIDER")
    private readonly adminNotificationProvider: TelegramAdminNotificationProvider,
  ) {}

  // ====================================================
  // ADMIN METHODS
  // ====================================================
  async notifyAdmin(message: string): Promise<TelegramNotificationResponseDto> {
    return this.adminNotificationProvider.notifyAdmin(message);
  }


  // ====================================================
  // CUSTOMER METHODS
  // ====================================================
  async notifyCustomer(telegramId: number, message: string): Promise<TelegramNotificationResponseDto> {
    return this.customerNotificationProvider.notifyCustomer(telegramId, message);
  }

  async notifyCustomerAboutOrderUpdate(orderId: string): Promise<TelegramNotificationResponseDto> {
    const foundOrder = await this.orderModel.findById(orderId).populate('orderedBy.customer', 'telegramId').lean({virtuals: true}).exec();
    if (!foundOrder) throw new NotFoundException('Заказ не найден');
    const telegramId = (foundOrder.orderedBy.customer as any).telegramId;
    if (!telegramId) throw new NotFoundException('Не удалось найти Telegram ID клиента');

    return this.customerNotificationProvider.notifyCustomerAboutOrderUpdate(telegramId, foundOrder);
  }

  async notifyCustomerAboutIssueUpdate(issueId: string): Promise<TelegramNotificationResponseDto> {
    const foundIssue = await this.issueModel.findOne({ _id: new Types.ObjectId(issueId), fromUserType: IssueUserType.CUSTOMER }).populate('from', 'telegramId').exec();
    if (!foundIssue) throw new NotFoundException('Заявка не найдена');
    const telegramId = (foundIssue.from as any).telegramId;
    if (!telegramId) throw new NotFoundException('Не удалось найти Telegram ID клиента');

    return this.customerNotificationProvider.notifyCustomerAboutIssueUpdate(telegramId, foundIssue);
  }
  

  // ====================================================
  // SELLER METHODS
  // ====================================================
  async notifySeller(telegramId: number, message: string): Promise<TelegramNotificationResponseDto> {
    return this.sellerNotificationProvider.notifySeller(telegramId, message);
  }

  async notifySellerAboutShiftUpdate(shiftId: string, haveOpened: boolean): Promise<TelegramNotificationResponseDto> {
    const foundShift = await this.shiftModel.findById(shiftId).populate({
      path: 'shop',
      select: 'owner shopName shopId _id',
      populate: {
        path: 'owner',
        select: 'telegramId'
      }
    }).lean({virtuals: true}).exec();
    if (!foundShift) throw new NotFoundException('Смена не найдена');
    const telegramId = (foundShift.shop as any).owner.telegramId;
    if (!telegramId) throw new NotFoundException('Не удалось найти Telegram ID продавца');
    return this.sellerNotificationProvider.notifySellerAboutShiftUpdate(telegramId, foundShift, haveOpened);
  }

  async notifySellerAboutIssueUpdate(issueId: string): Promise<TelegramNotificationResponseDto> {
    const foundIssue = await this.issueModel.findOne({ _id: new Types.ObjectId(issueId), fromUserType: IssueUserType.SELLER }).populate('from', 'telegramId').exec();
    if (!foundIssue) throw new NotFoundException('Заявка не найдена');
    const telegramId = (foundIssue.from as any).telegramId;
    if (!telegramId) throw new NotFoundException('Не удалось найти Telegram ID продавца');
    return this.sellerNotificationProvider.notifySellerAboutIssueUpdate(telegramId, foundIssue);
  }

  // ====================================================
  // EMPLOYEE METHODS
  // ====================================================

  async notifyEmployee(telegramId: number, message: string): Promise<TelegramNotificationResponseDto> {
    return this.employeeNotificationProvider.notifyEmployee(telegramId, message);
  }
  async notifyEmployeeAboutNewOrder(orderId: string): Promise<TelegramNotificationResponseDto> {
    const foundOrder = await this.orderModel.findById(new Types.ObjectId(orderId)).populate('shift', 'openedBy').exec();
    if (!foundOrder) throw new NotFoundException('Заказ не найден');
    
    // @ts-ignore
    const foundEmployee = await this.employeeModel.findById(foundOrder.shift.openedBy.employee).select('_id telegramId').exec();
    if (!foundEmployee) throw new NotFoundException('Сотрудник не найден');
    
    const telegramId = (foundEmployee as any).telegramId;
    if (!telegramId) throw new NotFoundException('Не удалось найти Telegram ID сотрудника');
    
    return this.employeeNotificationProvider.notifyEmployeeAboutNewOrder(telegramId, foundOrder);
  }

  async notifyEmployeeAboutNewRequestFromSeller(telgramId: number, requestToEmployeeId: string): Promise<TelegramNotificationResponseDto> {
    return this.employeeNotificationProvider.notifyEmployeeAboutNewRequestFromSeller(telgramId, requestToEmployeeId);
  }

  async notifyEmployeeAboutLoginToShop(telegramId: number, loginCode: EmployeeLoginCode): Promise<TelegramNotificationResponseDto> {
    return this.employeeNotificationProvider.notifyEmployeeAboutLoginToShop(telegramId, loginCode);
  }
}