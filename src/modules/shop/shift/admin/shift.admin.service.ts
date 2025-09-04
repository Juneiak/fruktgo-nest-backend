import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ShiftModel } from '../shift.schema';
import { plainToInstance } from 'class-transformer';
import { checkId } from "src/common/utils";
import { LogsService } from 'src/common/modules/logs/logs.service';
import {AuthenticatedUser} from 'src/common/types';
import { PaginatedResponseDto, PaginationMetaDto, PaginationQueryDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';
import { ShiftPreviewResponseDto, ShiftFullResponseDto } from './shift.admin.response.dto';
import { ShiftFilterQuery } from './shift.admin.filter.dto';


@Injectable()
export class ShiftAdminService {
  constructor(
    @InjectModel('Shift') private shiftModel: ShiftModel,
    private readonly logsService: LogsService
  ) {}


  async getShifts(
    authedAdmin: AuthenticatedUser,
    paginationQuery: PaginationQueryDto,
    shiftFilterQuery: ShiftFilterQuery
  ): Promise<PaginatedResponseDto<ShiftPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Строим фильтр для запроса
    const filter: any = {};
    
    // Фильтр по магазину
    if (shiftFilterQuery.shopId) {
      checkId([shiftFilterQuery.shopId]);
      filter.shop = new Types.ObjectId(shiftFilterQuery.shopId);
    }
    
    // Фильтр по сотруднику (который открыл смену)
    if (shiftFilterQuery.employeeId) {
      checkId([shiftFilterQuery.employeeId]);
      filter['openedBy.employee'] = new Types.ObjectId(shiftFilterQuery.employeeId);
    }
    
    // Фильтр по диапазону дат (по дате открытия смены)
    if (shiftFilterQuery.startDate || shiftFilterQuery.endDate) {
      filter.openedAt = {};
      if (shiftFilterQuery.startDate) {
        filter.openedAt.$gte = new Date(shiftFilterQuery.startDate);
      }
      if (shiftFilterQuery.endDate) {
        filter.openedAt.$lte = new Date(shiftFilterQuery.endDate);
      }
    }
    
    // Получаем общее количество смен для пагинации
    const totalItems = await this.shiftModel.countDocuments(filter).exec();
    
    // Получаем смены с пагинацией
    const shifts = await this.shiftModel.find(filter)
      .sort({ createdAt: -1 }) // Новые сначала
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    // Формируем метаданные пагинации
    const totalPages = Math.ceil(totalItems / pageSize);
    const pagination = { totalItems, totalPages, currentPage: page, pageSize };
    
    // Преобразуем данные в DTO
    const items = plainToInstance(ShiftPreviewResponseDto, shifts, { excludeExtraneousValues: true });
    
    return { items, pagination };
  }


  async getShiftLogs(
    authedAdmin: AuthenticatedUser,
    shiftId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.logsService.getAllShiftLogs(shiftId, paginationQuery);
  }


  async getShopShifts(
    authedAdmin: AuthenticatedUser, 
    shopId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftPreviewResponseDto>> {
    checkId([shopId]);
    
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество смен магазина для пагинации
    const totalItems = await this.shiftModel.countDocuments({ shop: new Types.ObjectId(shopId) }).exec();
    
    // Получаем смены с пагинацией
    const shifts = await this.shiftModel.find({ shop: new Types.ObjectId(shopId) })
      .sort({ createdAt: -1 }) // -1 для сортировки по убыванию (новые сначала)
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    // Формируем метаданные пагинации
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    // Преобразуем модели в DTO
    const items = plainToInstance(ShiftPreviewResponseDto, shifts, { excludeExtraneousValues: true });
    
    return { items, pagination };
  }


  async getShopShift(authedAdmin: AuthenticatedUser, shiftId: string): Promise<ShiftFullResponseDto> {
    checkId([shiftId]);
    const shift = await this.shiftModel.findById(new Types.ObjectId(shiftId))
      .populate({
        path: 'orders',
        options: { sort: { createdAt: -1 } } // -1 для сортировки по убыванию (новые сначала)
      })
      .lean({ virtuals: true })
      .exec();
    if (!shift) throw new NotFoundException('Смена не найден');
    
    return plainToInstance(ShiftFullResponseDto, shift, { excludeExtraneousValues: true });
  }


  async getShopShiftLogs(authedAdmin: AuthenticatedUser, shopId: string, shiftId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([shiftId]);
    return await this.logsService.getAllShiftLogs(shiftId, paginationQuery);
  }

}