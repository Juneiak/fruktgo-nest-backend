
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Seller } from '../seller.schema';
import { plainToInstance } from 'class-transformer';
import {
  SellerForAdminFullResponseDto,
  SellerForAdminPreviewResponseDto,
  UpdateSellerByAdminDto
} from './seller-for-admin.dtos';
import { checkId } from 'src/common/utils';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { LogsService } from 'src/common/modules/logs/logs.service';
import {AuthenticatedUser} from 'src/common/types';
import { PaginatedResponseDto, PaginationMetaDto, PaginationQueryDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@Injectable()
export class SellerForAdminService {
  constructor(
    @InjectModel('Seller') private sellerModel: Model<Seller>,
    private readonly logService: LogsService
  ) {}


  async getSellers(
    authedAdmin: AuthenticatedUser, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<SellerForAdminPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество продавцов для пагинации
    const totalItems = await this.sellerModel.countDocuments().exec();
    
    // Получаем продавцов с пагинацией
    const sellers = await this.sellerModel.find()
      .select('+internalNote +phone +telegramId +telegramUsername +telegramFirstName +telegramLastName')
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
    
    const items = plainToInstance(SellerForAdminPreviewResponseDto, sellers, { excludeExtraneousValues: true, exposeDefaultValues: true });
    return { items, pagination };
  }

  async getSeller(authedAdmin: AuthenticatedUser, sellerId: string): Promise<SellerForAdminFullResponseDto> {
    
    checkId([sellerId]);
    const seller = await this.sellerModel.findById(new Types.ObjectId(sellerId)).select('+internalNote +phone +telegramId +telegramUsername +telegramFirstName +telegramLastName')
    .populate('employees', 'employeeId isBlocked verifiedStatus employeeAvatar employeeName phone telegramId telegramUsername sex status pinnedTo')
    .populate('shops', 'isBlocked verifiedStatus shopName shopImage address status openAt closeAt avgRating totalSales ratingsCount minOrderSum lastShiftDate shopOrdersCount shopProductsCount createdAt shopId')
    .lean({ virtuals: true }).exec();
    if (!seller) throw new NotFoundException('Продавец не найден');
    return plainToInstance(SellerForAdminFullResponseDto, seller, { excludeExtraneousValues: true, exposeDefaultValues: true });
  }

  async getSellerLogs(authedAdmin: AuthenticatedUser, sellerId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    return this.logService.getAllSellerLogs(sellerId, paginationQuery);
  }

  async updateSeller(authedAdmin: AuthenticatedUser, sellerId: string, dto: UpdateSellerByAdminDto): Promise<SellerForAdminFullResponseDto> {
    
    checkId([sellerId]);
    const seller = await this.sellerModel.findById(sellerId);
    if (!seller) throw new NotFoundException(`Продавец с ID ${sellerId} не найден`);
    
    // Собираем изменения для лога
    const changes: string[] = [];
    
    if (dto.isBlocked !== undefined && dto.isBlocked !== seller.isBlocked) {
      const oldValue = seller.isBlocked ? 'Да' : 'Нет';
      const newValue = dto.isBlocked ? 'Да' : 'Нет';
      seller.isBlocked = dto.isBlocked;
      changes.push(`Блокировка: ${oldValue} -> ${newValue}`);
    }
    
    if (dto.verifiedStatus !== undefined && dto.verifiedStatus !== seller.verifiedStatus) {
      const oldValue = seller.verifiedStatus;
      seller.verifiedStatus = dto.verifiedStatus;
      changes.push(`Статус верификации: "${oldValue}" -> "${dto.verifiedStatus}"`);
    }
    
    if (dto.internalNote !== undefined) {
      seller.internalNote = dto.internalNote;
    }
    
    // Если были изменения, сохраняем и логируем
    if (changes.length > 0 || dto.internalNote !== undefined) {
      // Сохраняем изменения
      await seller.save();
      
      // Формируем текст лога
      let logText = `Администратор обновил данные продавца (${seller.companyName})`;
      if (changes.length > 0) {
        logText += `:\n${changes.join('\n')}`;
      }
      
      // Добавляем запись в лог
      await this.logService.addSellerLog(seller._id.toString(),LogLevel.SERVICE, logText);
    }
    
    return this.getSeller(authedAdmin, sellerId);
  }
}