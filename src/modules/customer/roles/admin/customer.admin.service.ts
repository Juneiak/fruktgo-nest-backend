import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { checkId, transformPaginatedResult } from 'src/common/utils';
import { plainToInstance } from 'class-transformer';
import { LogLevel } from "src/common/modules/logs/logs.schema";
import { CustomerModel } from '../../schemas/customer.schema';
import {
  CustomerFullResponseDto,
  CustomerPreviewResponseDto
} from './customer.admin.response.dtos';
import { NotifyCustomerDto, UpdateCustomerDto } from './customer.admin.request.dtos';
import { LogsService } from 'src/common/modules/logs/logs.service';
import { AuthenticatedUser } from 'src/common/types';
import { UserType } from "src/common/enums/common.enum";
import { PaginatedResponseDto, PaginationQueryDto, TelegramNotificationResponseDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.response.dto';
import { NotificationService } from 'src/modules/notification/notification.service';
import { BlockDto } from 'src/common/dtos/block.dto';

@Injectable()
export class CustomerAdminService {
  constructor(
    @InjectModel('Customer') private customerModel: CustomerModel,
    private readonly notificationService: NotificationService,
    private logsService: LogsService,
  ) { }

  async sendNotificationToCustomer(authedAdmin: AuthenticatedUser, dto: NotifyCustomerDto): Promise<TelegramNotificationResponseDto> {
    return this.notificationService.notifyCustomer(dto.telegramId, dto.message);
  }


  async getAllCustomers(
    authedAdmin: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<CustomerPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;

    const result = await this.customerModel.paginate({}, {
      page,
      limit: pageSize,
      lean: true,
      leanWithId: false,
      sort: { createdAt: -1 },
    });
    return transformPaginatedResult(result, CustomerPreviewResponseDto);
  }


  async getCustomer(authedAdmin: AuthenticatedUser, customerId: string): Promise<CustomerFullResponseDto> {
    checkId([customerId]);
    const customer = await this.customerModel.findById(new Types.ObjectId(customerId)).lean({ virtuals: true }).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');

    return plainToInstance(CustomerFullResponseDto, customer, { excludeExtraneousValues: true });
  }


  async getCustomerLogs(authedAdmin: AuthenticatedUser, customerId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([customerId]);
    return await this.logsService.getAllCustomerLogs(customerId, paginationQuery, [UserType.ADMIN]);
  }


  async updateCustomer(
    authedAdmin: AuthenticatedUser,
    customerId: string,
    dto: UpdateCustomerDto
  ): Promise<CustomerFullResponseDto> {
    checkId([customerId]);
    const customer = await this.customerModel.findById(new Types.ObjectId(customerId)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');

    const changes: string[] = [];

    if (dto.verifiedStatus !== undefined) {
      const oldValue = customer.verifiedStatus;
      customer.verifiedStatus = dto.verifiedStatus;
      changes.push(`статус верификации: ${oldValue} -> ${dto.verifiedStatus}`);
    }

    if (dto.bonusPoints !== undefined) {
      const oldValue = customer.bonusPoints;
      customer.bonusPoints = dto.bonusPoints;
      changes.push(`бонусные баллы: ${oldValue} -> ${dto.bonusPoints}`);
    }

    if (dto.internalNote !== undefined) {
      const oldValue = customer.internalNote;
      customer.internalNote = dto.internalNote;
      changes.push(`примечание админа: ${oldValue} -> ${dto.internalNote}`);
    }

    if (changes.length > 0 && customer.isModified()) {
      await customer.save();
      await this.logsService.addCustomerLog(
        customerId,
        `Админ ${authedAdmin.id} изменил данные клиента: ${changes.join('; ')}`,
        { logLevel: LogLevel.LOW, forRoles: [UserType.CUSTOMER] });
    }
    return this.getCustomer(authedAdmin, customerId);
  }


  async blockCustomer(authedAdmin: AuthenticatedUser, customerId: string, dto: BlockDto): Promise<CustomerFullResponseDto> {
    checkId([customerId]);
    const customer = await this.customerModel.findById(new Types.ObjectId(customerId)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');

    const changes: string[] = [];

    if (dto.status !== undefined) {
      const oldValue = customer.blocked.status;
      customer.blocked.status = dto.status;
      changes.push(`статус блокировки: ${oldValue} -> ${dto.status}`);
    }
    if (dto.reason !== undefined) {
      const oldValue = customer.blocked.reason;
      customer.blocked.reason = dto.reason;
      changes.push(`причина блокировки: ${oldValue} -> ${dto.reason}`);
    }
    if (dto.code !== undefined) {
      const oldValue = customer.blocked.code;
      customer.blocked.code = dto.code;
      changes.push(`код блокировки: ${oldValue} -> ${dto.code}`);
    }
    if (dto.blockedUntil !== undefined) {
      const oldValue = customer.blocked.blockedUntil;
      customer.blocked.blockedUntil = dto.blockedUntil;
      changes.push(`срок блокировки: ${oldValue} -> ${dto.blockedUntil}`);
    }

    if (changes.length > 0 && customer.isModified()) {
      await customer.save();
      await this.logsService.addCustomerLog(
        customerId, 
        `Админ ${authedAdmin.id} изменил статус блокировки клиента: ${changes.join(', ')}`, 
        { logLevel: LogLevel.LOW, forRoles: [UserType.CUSTOMER] }
      );
    }

    return this.getCustomer(authedAdmin, customerId);
  }
}