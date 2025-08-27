
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop } from '../schemas/shop.schema';
import { Shift } from '../schemas/shift.schema';
import { plainToInstance } from 'class-transformer';
import {
  ShopForAdminPreviewResponseDto,
  ShopForAdminFullResponseDto,
  UpdateShopByAdminDto,
  ShopShiftForAdminPreviewResponceDto,
  ShopShiftForAdminFullResponseDto,
  ShopProductForAdminPreviewResponseDto,
  ShopProductForAdminFullResponseDto,
  ShiftFilterQuery
} from './shop-for-admin.dtos';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { checkId } from "src/common/utils";
import { LogsService } from 'src/common/modules/logs/logs.service';
import {AuthenticatedUser} from 'src/common/types';
import { PaginatedResponseDto, PaginationMetaDto, PaginationQueryDto } from 'src/common/dtos';
import { ShopProduct } from '../schemas/shop-product.schema';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@Injectable()
export class ShopForAdminService {
  constructor(
    @InjectModel('Shop') private shopModel: Model<Shop>,
    @InjectModel('Shift') private shiftModel: Model<Shift>,
    @InjectModel('ShopProduct') private shopProductModel: Model<ShopProduct>,
    private readonly logsService: LogsService
  ) {}


  async getShops(
    authedAdmin: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopForAdminPreviewResponseDto>> {
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
    
    const items = plainToInstance(ShopForAdminPreviewResponseDto, shops, { excludeExtraneousValues: true, exposeDefaultValues: true });
    return { items, pagination };
  }
  
  async getShop(authedAdmin: AuthenticatedUser, shopId: string): Promise<ShopForAdminFullResponseDto> {
    checkId([shopId]);
    const shop = await this.shopModel.findById(shopId)
      .select("+internalNote")
      .populate("pinnedEmployees")
      .populate("owner", 'sellerId companyName')
      .exec();
    if (!shop) throw new NotFoundException(`Магазин с ID ${shopId} не найден`);
    
    return plainToInstance(ShopForAdminFullResponseDto, shop, { excludeExtraneousValues: true, exposeDefaultValues: true });
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
    dto: UpdateShopByAdminDto,
  ): Promise<ShopForAdminFullResponseDto> {
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


  // ====================================================
  // SHIFTS
  // ====================================================
  async getShifts(
    authedAdmin: AuthenticatedUser,
    paginationQuery: PaginationQueryDto,
    shiftFilterQuery: ShiftFilterQuery
  ): Promise<PaginatedResponseDto<ShopShiftForAdminPreviewResponceDto>> {
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
    const items = plainToInstance(ShopShiftForAdminPreviewResponceDto, shifts, { 
      excludeExtraneousValues: true 
    });
    
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
  ): Promise<PaginatedResponseDto<ShopShiftForAdminPreviewResponceDto>> {
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
    const items = plainToInstance(
      ShopShiftForAdminPreviewResponceDto, 
      shifts, 
      { excludeExtraneousValues: true }
    );
    
    return { items, pagination };
  }

  async getShopShift(authedAdmin: AuthenticatedUser, shiftId: string): Promise<ShopShiftForAdminFullResponseDto> {
    checkId([shiftId]);
    const shift = await this.shiftModel.findById(new Types.ObjectId(shiftId))
      .populate({
        path: 'orders',
        options: { sort: { createdAt: -1 } } // -1 для сортировки по убыванию (новые сначала)
      })
      .lean({ virtuals: true })
      .exec();
    if (!shift) throw new NotFoundException('Смена не найден');
    
    return plainToInstance(ShopShiftForAdminFullResponseDto, shift, { excludeExtraneousValues: true });
  }

  async getShopShiftLogs(authedAdmin: AuthenticatedUser, shopId: string, shiftId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([shiftId]);
    return await this.logsService.getAllShiftLogs(shiftId, paginationQuery);
  }


  // ====================================================
  // SHOP PRODUCTS 
  // ====================================================
  async getShopProduct(authedAdmin: AuthenticatedUser,shopId: string, shopProductId: string): Promise<ShopProductForAdminFullResponseDto> {
    checkId([shopProductId, shopId]);
    const foundShopProduct = await this.shopProductModel.findOne({pinnedTo: new Types.ObjectId(shopId), _id: new Types.ObjectId(shopProductId)})
    .select('shopProductId pinnedTo product stockQuantity status images')
    .populate({
      path: 'images',
      select: '_id imageId createdAt',
      options: { sort: { createdAt: -1 } },
    })
    .populate({
      path: 'logs',
      options: { sort: { createdAt: -1 } },
    })
    .populate({
      path: 'product',
      select: 'productId cardImage productArticle productName category price measuringScale stepRate aboutProduct origin',
    })
    .lean({ virtuals: true }).exec();
    if (!foundShopProduct) throw new NotFoundException('Товар не найден');
    
    return plainToInstance(ShopProductForAdminFullResponseDto, foundShopProduct, { excludeExtraneousValues: true });
  }

  async getShopProducts(
    authedAdmin: AuthenticatedUser, 
    shopId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductForAdminPreviewResponseDto>> {
    checkId([shopId]);
    
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество товаров магазина для пагинации
    const totalItems = await this.shopProductModel.countDocuments({ pinnedTo: new Types.ObjectId(shopId) }).exec();
    
    // Получаем товары с пагинацией
    const shopProducts = await this.shopProductModel.find({ pinnedTo: new Types.ObjectId(shopId) })
      .populate('product')
      .sort({ createdAt: -1 }) // Сортировка по дате создания (от новых к старым)
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
    const items = plainToInstance(
      ShopProductForAdminPreviewResponseDto, 
      shopProducts, 
      { excludeExtraneousValues: true }
    );
    
    return { items, pagination };
  }

}