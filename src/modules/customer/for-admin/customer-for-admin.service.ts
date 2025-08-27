import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { checkId } from 'src/common/utils';
import { plainToInstance } from 'class-transformer';
import { LogLevel } from "src/common/modules/logs/logs.schemas";

import { Customer } from '../schemas/customer.schema';
import {
  UpdateCustomerByAdminDto,
  CustomerForAdminFullResponseDto,
  CustomerForAdminPreviewResponseDto
} from './customer-for-admin.dtos';
import { LogsService } from 'src/common/modules/logs/logs.service';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationMetaDto, PaginationQueryDto } from 'src/common/dtos';
import { LogDto, PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@Injectable()
export class CustomerForAdminService {
  constructor(
    @InjectModel('Customer') private customerModel: Model<Customer>,
    private logsService: LogsService,
  ) {}


  async getAllCustomers(
    authedAdmin: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<CustomerForAdminPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество клиентов для пагинации
    const totalItems = await this.customerModel.countDocuments().exec();
    
    // Получаем клиентов с пагинацией
    const allCustomers = await this.customerModel.find()
      .select('+internalNote +email +phone +telegramId +telegramUsername +telegramFirstName +telegramLastName')
      .skip(skip)
      .limit(pageSize)
      .lean({virtuals: true})
      .exec();
    
    // Формируем метаданные пагинации
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    const items = plainToInstance(CustomerForAdminPreviewResponseDto, allCustomers, { excludeExtraneousValues: true, enableCircularCheck: true });
    return { items, pagination };
  }

  async getCustomer(authedAdmin: AuthenticatedUser, customerId: string): Promise<CustomerForAdminFullResponseDto> {
    checkId([customerId]);
    const customer = await this.customerModel.findById(new Types.ObjectId(customerId))
    .select('+internalNote +email +phone +telegramId +telegramUsername +telegramFirstName +telegramLastName')
    .lean({virtuals: true})
    .exec();
    if (!customer) throw new NotFoundException('Клиент не найден');
    return plainToInstance(CustomerForAdminFullResponseDto, customer, { excludeExtraneousValues: true, enableCircularCheck: true });
  }

  async getCustomerLogs(authedAdmin: AuthenticatedUser, customerId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([customerId]);
    return await this.logsService.getAllCustomerLogs(customerId, paginationQuery);
  }

  async updateCustomer(
    authedAdmin: AuthenticatedUser,
    customerId: string, 
    dto: UpdateCustomerByAdminDto)
  : Promise<CustomerForAdminFullResponseDto> {

    checkId([customerId]);
    const customer = await this.customerModel.findById(new Types.ObjectId(customerId)).exec();
    if (!customer) throw new NotFoundException('Клиент не найден');
    
    const updateData: Partial<Customer> = {};
    
    // Подготовим массив для хранения изменений для лога
    const changedFields: string[] = [];
    
    if (dto.isBlocked !== undefined) {
      updateData.isBlocked = dto.isBlocked;
      changedFields.push(`блокировка: ${customer.isBlocked ? 'Да' : 'Нет'} -> ${dto.isBlocked ? 'Да' : 'Нет'}`);
    }
    
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
}