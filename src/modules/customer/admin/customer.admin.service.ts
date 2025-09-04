import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { checkId, transformPaginatedResult } from 'src/common/utils';
import { plainToInstance } from 'class-transformer';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { Customer, CustomerModel } from '../schemas/customer.schema';
import {
  CustomerFullResponseDto,
  CustomerPreviewResponseDto
} from './customer.admin.response.dto';
import { NotifyCustomerDto, UpdateCustomerDto } from './customer.admin.request.dto';
import { LogsService } from 'src/common/modules/logs/logs.service';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto, TelegramNotificationResponseDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';
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
      select: '+internalNote +email +phone +telegramId +telegramUsername +telegramFirstName +telegramLastName',
      lean: true,
      leanWithId: false,
      sort: { createdAt: -1 },
    });
    return transformPaginatedResult(result, CustomerPreviewResponseDto);
  }


  async getCustomer(authedAdmin: AuthenticatedUser, customerId: string): Promise<CustomerFullResponseDto> {
    checkId([customerId]);
    const customer = await this.customerModel
      .findById(new Types.ObjectId(customerId))
      .select('+internalNote +email +phone +telegramId +telegramUsername +telegramFirstName +telegramLastName')
      .lean({ virtuals: true })
      .exec();
    if (!customer) throw new NotFoundException('Клиент не найден');
    return plainToInstance(CustomerFullResponseDto, customer, { excludeExtraneousValues: true });
  }


  async getCustomerLogs(authedAdmin: AuthenticatedUser, customerId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([customerId]);
    return await this.logsService.getAllCustomerLogs(customerId, paginationQuery);
  }


  async updateCustomer(
    authedAdmin: AuthenticatedUser,
    customerId: string,
    dto: UpdateCustomerDto)
    : Promise<CustomerFullResponseDto> {

    checkId([customerId]);
    const customer = await this.customerModel.findById(new Types.ObjectId(customerId)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');

    const updateData: Partial<Customer> = {};

    // Подготовим массив для хранения изменений для лога
    const changedFields: string[] = [];

    if (dto.verifiedStatus !== undefined) {
      updateData.verifiedStatus = dto.verifiedStatus;
      changedFields.push(`статус верификации: ${customer.verifiedStatus} -> ${dto.verifiedStatus}`);
    }

    if (dto.bonusPoints !== undefined) {
      updateData.bonusPoints = dto.bonusPoints;
      changedFields.push(`бонусные баллы: ${customer.bonusPoints} -> ${dto.bonusPoints}`);
    }

    if (dto.internalNote !== undefined) {
      updateData.internalNote = dto.internalNote;
      const oldNote = customer.internalNote || 'пусто';
      const newNote = dto.internalNote || 'пусто';
      changedFields.push(`примечание админа: ${oldNote} -> ${newNote}`);
    }

    // Если нет изменений, возвращаем текущего клиента
    if (changedFields.length === 0) return this.getCustomer(authedAdmin, customerId);

    // Обновляем клиента в базе данных и получаем обновленный документ
    const updatedCustomer = await this.customerModel.findByIdAndUpdate(new Types.ObjectId(customerId), { $set: updateData }, { new: true }).exec();
    if (!updatedCustomer) throw new NotFoundException('Ошибка при обновлении клиента');

    // Формируем текст лога
    const logText = `Админ ${authedAdmin.id} изменил данные клиента: ${changedFields.join('; ')}`;

    // Добавляем запись в лог
    await this.logsService.addCustomerLog(customerId, LogLevel.SERVICE, logText);

    // Преобразуем документ в DTO для ответа
    return this.getCustomer(authedAdmin, customerId);
  }


  async blockCustomer(authedAdmin: AuthenticatedUser, customerId: string, dto: BlockDto): Promise<CustomerFullResponseDto> {
    checkId([customerId]);
    const customer = await this.customerModel.findById(new Types.ObjectId(customerId)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');
    
    const changedFields: string[] = [];

    if (dto.status !== undefined) {
      customer.blocked.status = dto.status;
      changedFields.push(`статус блокировки: ${customer.blocked.status} -> ${dto.status}`);
    }
    if (dto.reason !== undefined) {
      customer.blocked.reason = dto.reason;
      changedFields.push(`причина блокировки: ${customer.blocked.reason} -> ${dto.reason}`);
    }
    if (dto.code !== undefined) {
      customer.blocked.code = dto.code;
      changedFields.push(`код блокировки: ${customer.blocked.code} -> ${dto.code}`);
    }
    if (dto.blockedUntil !== undefined) {
      customer.blocked.blockedUntil = dto.blockedUntil;
      changedFields.push(`срок блокировки: ${customer.blocked.blockedUntil} -> ${dto.blockedUntil}`);
    }
    customer.blocked = dto;
    await customer.save();

    const changes = `блокировка: ${changedFields.join(', ')}`;
    await this.logsService.addCustomerLog(customerId, LogLevel.SERVICE, `Админ ${authedAdmin.id} изменил статус блокировки клиента: ${changes}`);

    return this.getCustomer(authedAdmin, customerId);
  }
}