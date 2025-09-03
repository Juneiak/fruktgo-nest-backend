import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import {
  ShopPreviewResponseDto,
  ShopFullResponseDto,
} from './shop.admin.response.dto';
import { UpdateShopDto } from './shop.admin.request.dto';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { checkId } from "src/common/utils";
import { LogsService } from 'src/common/modules/logs/logs.service';
import {AuthenticatedUser} from 'src/common/types';
import { PaginatedResponseDto, PaginationMetaDto, PaginationQueryDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';
import { ShopModel } from '../../schemas/shop.schema';

@Injectable()
export class ShopAdminService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
    private readonly logsService: LogsService
  ) {}


  async getShops(
    authedAdmin: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество магазинов для пагинации
    const totalItems = await this.shopModel.countDocuments().exec();
    
    // Получаем магазины с пагинацией
    const shops = await this.shopModel.find()
      .select("+internalNote")
      .populate("owner", 'sellerId companyName')
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
    
    const items = plainToInstance(ShopPreviewResponseDto, shops, { excludeExtraneousValues: true, exposeDefaultValues: true });
    return { items, pagination };
  }

  
  async getShop(authedAdmin: AuthenticatedUser, shopId: string): Promise<ShopFullResponseDto> {
    checkId([shopId]);
    const shop = await this.shopModel.findById(shopId)
      .select("+internalNote")
      .populate("pinnedEmployees")
      .populate("owner", 'sellerId companyName')
      .exec();
    if (!shop) throw new NotFoundException(`Магазин с ID ${shopId} не найден`);
    
    return plainToInstance(ShopFullResponseDto, shop, { excludeExtraneousValues: true, exposeDefaultValues: true });
  }


  async getShopLogs(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.logsService.getAllShopLogs(shopId, paginationQuery);
  }


  async updateShop(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    dto: UpdateShopDto,
  ): Promise<ShopFullResponseDto> {
    checkId([shopId]);
    
    // Ищем магазин по ID
    const shop = await this.shopModel.findById(shopId);
    if (!shop) throw new NotFoundException(`Магазин с ID ${shopId} не найден`);
    
    // Собираем изменения для лога
    const changes: string[] = [];
    
    if (dto.isBlocked !== undefined && dto.isBlocked !== shop.isBlocked) {
      const oldValue = shop.isBlocked ? 'Да' : 'Нет';
      const newValue = dto.isBlocked ? 'Да' : 'Нет';
      shop.isBlocked = dto.isBlocked;
      changes.push(`Блокировка: ${oldValue} -> ${newValue}`);
    }
    
    if (dto.verifiedStatus !== undefined && dto.verifiedStatus !== shop.verifiedStatus) {
      const oldValue = shop.verifiedStatus;
      shop.verifiedStatus = dto.verifiedStatus;
      changes.push(`Статус верификации: "${oldValue}" -> "${dto.verifiedStatus}"`);
    }
    
    if (dto.internalNote !== undefined) shop.internalNote = dto.internalNote;
    
    // Если были изменения, сохраняем и логируем
    if (changes.length > 0 || dto.internalNote !== undefined) {
      // Сохраняем изменения
      await shop.save();
      
      // Формируем текст лога
      let logText = `Администратор обновил данные магазина (${shop.shopName})`;
      if (changes.length > 0) logText += `:\n${changes.join('\n')}`;
      
      // Добавляем запись в лог
      await this.logsService.addShopLog(shop._id.toString(), LogLevel.SERVICE, logText);
    }
    
    // Возвращаем обновленные данные
    return this.getShop(authedAdmin, shopId);
  }

}