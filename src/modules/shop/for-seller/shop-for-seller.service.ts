import { Injectable, ForbiddenException, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UploadsService } from 'src/common/modules/uploads/uploads.service';
import { PaginationQueryDto, PaginationMetaDto, PaginatedResponseDto } from "src/common/dtos";
import { EntityType, ImageType } from 'src/common/modules/uploads/uploaded-file.schema';
import { Shop } from '../schemas/shop.schema';
import { plainToInstance } from 'class-transformer';
import {
  ShopForSellerPreviewResponseDto, 
  ShopForSellerFullResponseDto, 
  UpdateShopDto,
  CreateShopDto,
  UpdateShopProductBySellerDto,
  ShopProductForSellerResponseDto,
  ShiftForSellerFullResponseDto,
  ShiftForSellerPreviewResponseDto,
  ShiftForSellerTelegramBotPreviewResponseDto,
} from './shops-for-seller.dtos';
import { Seller } from 'src/modules/seller/seller.schema';
import { verifyUserStatus } from 'src/common/utils';
import { ShopProductStatus } from "src/modules/shop/schemas/shop-product.schema";
import { ShopProduct } from '../schemas/shop-product.schema';
import { Product } from 'src/modules/product/product.schema';
import { MessageResponseDto } from 'src/common/dtos';
import {checkId} from 'src/common/utils';
import { Shift } from '../schemas/shift.schema';
import { EmployeeForSellerResponseDto } from 'src/modules/employee/for-seller/employee-for-seller.dtos'
import { LogsService } from 'src/common/modules/logs/logs.service';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { AuthenticatedUser, UserType } from 'src/common/types';
import { Employee } from 'src/modules/employee/schemas/employee.schema';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@Injectable()
export class ShopForSellerService {
  constructor(
    @InjectModel('Seller') private sellerModel: Model<Seller>,
    @InjectModel('Shop') private shopModel: Model<Shop>,
    @InjectModel('ShopProduct') private shopProductModel: Model<ShopProduct>,
    @InjectModel('Product') private productModel: Model<Product>,
    @InjectModel('Shift') private shiftModel: Model<Shift>,
    @InjectModel('Employee') private employeeModel: Model<Employee>,
    private readonly logsService: LogsService,
    private readonly uploadsService: UploadsService
  ) {}

  
  // ====================================================
  // SHOPS 
  // ====================================================
  
  async getShops(authedSeller: AuthenticatedUser): Promise<ShopForSellerPreviewResponseDto[]> {
    const foundShops = await this.shopModel.find({ owner: new Types.ObjectId(authedSeller.id) }).lean({ virtuals: true }).exec();
    if (!foundShops) throw new NotFoundException('Продавец не найден');

    return plainToInstance(ShopForSellerPreviewResponseDto, foundShops, { excludeExtraneousValues: true });
  }



  async getFullShop(authedSeller: AuthenticatedUser, shopId: string): Promise<ShopForSellerFullResponseDto> {
    checkId([shopId]);
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).populate('currentShift').lean({ virtuals: true }).exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    if (!foundShop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');
    return plainToInstance(ShopForSellerFullResponseDto, foundShop, { excludeExtraneousValues: true });
  }



  async getPreviewShop(authedSeller: AuthenticatedUser, shopId: string): Promise<ShopForSellerPreviewResponseDto> {
    checkId([shopId]);
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).lean({ virtuals: true }).exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    if (!foundShop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');

    return plainToInstance(ShopForSellerPreviewResponseDto, foundShop, { excludeExtraneousValues: true });
  }



  async createShop(authedSeller: AuthenticatedUser, dto: CreateShopDto, shopImage?: Express.Multer.File): Promise<ShopForSellerPreviewResponseDto> {
    // Получаем сессию из соединения с MongoDB для транзакций
    const session = await this.shopModel.db.startSession();

    try {
      // Начинаем транзакцию
      session.startTransaction();
      
      // Находим продавца в рамках транзакции
      const foundSeller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id))
        .select('_id verifiedStatus isBlocked')
        .session(session)
        .lean()
        .exec();
        
      if (!foundSeller) throw new NotFoundException('Продавец не найден');
      verifyUserStatus(foundSeller);

      // Формируем объект с адресными данными, если они есть
      const { city, street, house, latitude, longitude, ...restDto } = dto;
      
      // Проверяем, есть ли хотя бы одно адресное поле
      const hasAddressData = city || street || house || latitude || longitude;
      
      // Создаем магазин внутри транзакции
      const shop = await this.shopModel.create([{
        ...restDto,
        owner: foundSeller._id,
        // Если есть адресные данные, создаем объект address
        ...(hasAddressData ? {
          address: {
            city: city || null,
            street: street || null,
            house: house || null,
            latitude: latitude || null,
            longitude: longitude || null
          }
        } : {})
      }], { session }).then(docs => docs[0]);
      
      if (!shop) throw new NotFoundException('Не удалось создать магазин');

      // Если есть изображение, загружаем его в рамках транзакции
      if (shopImage) {
        const createdImage = await this.uploadsService.uploadImage({
          file: shopImage,
          accessLevel: 'public',
          entityType: EntityType.shop,
          entityId: shop._id.toString(),
          imageType: ImageType.shopImage,
          session // Передаем сессию в метод uploadImage
        });
        
        // Обновляем магазин в рамках транзакции
        await this.shopModel.findByIdAndUpdate(
          shop._id,
          { shopImage: createdImage._id }, // Используем поле shopImage из схемы Shop
          { session, new: true }
        ).exec();
      }
      // Фиксируем изменения
      await session.commitTransaction();

      const logDetails = [
        `Продавец ${foundSeller._id.toString()} создал магазин ${shop._id.toString()}`,
        `Название: "${shop.shopName}"`,
        dto.aboutShop ? `Описание: указано` : '',
        dto.city ? `Город: указан` : '',
        dto.street ? `Улица: указан` : '',
        dto.house ? `Дом: указан` : '',
        dto.latitude ? `Широта: указан` : '',
        dto.longitude ? `Долгота: указан` : '',
        dto.openAt || dto.closeAt ? `Часы работы: ${dto.openAt ? `открытие в ${dto.openAt}` : ''}${dto.closeAt ? `${dto.openAt ? ', ' : ''}закрытие в ${dto.closeAt}` : ''}` : '',
        dto.minOrderSum ? `Мин. сумма заказа: ${dto.minOrderSum}` : '',
        shopImage ? 'Изображение: загружено' : ''
      ].filter(item => item !== '').join('; ');
      await this.logsService.addShopLog(shop._id.toString(), LogLevel.LOW, logDetails);
      
      const sellerLogDetails = [
        `Создан новый магазин "${shop.shopName}" (ID: ${shop._id.toString()})`,
        `Название: "${shop.shopName}"`,
        dto.aboutShop ? `Описание: указано` : '',
        dto.city ? `Город: указан` : '',
        dto.street ? `Улица: указан` : '',
        dto.house ? `Дом: указан` : '',
        dto.latitude ? `Широта: указан` : '',
        dto.longitude ? `Долгота: указан` : '',
        dto.openAt || dto.closeAt ? `Часы работы: ${dto.openAt ? `открытие в ${dto.openAt}` : ''}${dto.closeAt ? `${dto.openAt ? ', ' : ''}закрытие в ${dto.closeAt}` : ''}` : '',
        dto.minOrderSum ? `Мин. сумма заказа: ${dto.minOrderSum}` : '',
        shopImage ? 'Изображение: загружено' : ''
      ].filter(item => item !== '').join('; ');
      await this.logsService.addSellerLog(foundSeller._id.toString(), LogLevel.LOW, sellerLogDetails);
      
      return this.getPreviewShop(authedSeller, shop._id.toString());

    } catch (error) {
      await session.abortTransaction();
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('Ошибка при создании магазина:', error);
      throw new InternalServerErrorException('Не удалось создать магазин');
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }

  

  async updateShop(authedSeller: AuthenticatedUser, shopId: string, dto: UpdateShopDto, shopImage?: Express.Multer.File): Promise<ShopForSellerFullResponseDto> {
    // Получаем сессию из соединения с MongoDB для транзакций
    const session = await this.shopModel.db.startSession();
    
    try {
      // Начинаем транзакцию
      session.startTransaction();
      
      // Находим продавца в рамках транзакции
      const foundSeller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id))
        .select('_id verifiedStatus isBlocked')
        .session(session)
        .lean()
        .exec();
        
      if (!foundSeller) throw new NotFoundException('Продавец не найден');
      verifyUserStatus(foundSeller);
      
      // Проверяем и находим магазин в рамках транзакции
      checkId([shopId]);
      const foundShop = await this.shopModel.findOne({ 
        _id: new Types.ObjectId(shopId), 
        owner: foundSeller._id 
      }).session(session).lean().exec();
      
      if (!foundShop) throw new NotFoundException('Магазин не найден');
      if (!foundShop.owner.equals(foundSeller._id)) throw new ForbiddenException('Недостаточно прав');
      
      // Сохраняем старый ID изображения, если есть
      const oldImageId = foundShop.shopImage || null;
      
      // Обновляем базовые данные магазина (в UpdateShopDto нет полей для адреса)
      const updateFields: any = {...dto};
      
      // Обработка изображения, если оно есть
      if (shopImage) {
        // Загружаем изображение в рамках транзакции
        const createdImage = await this.uploadsService.uploadImage({
          file: shopImage,
          accessLevel: 'public',
          entityType: EntityType.shop,
          entityId: foundShop._id.toString(),
          imageType: ImageType.shopImage,
          session // Передаем сессию в метод uploadImage
        });
        
        // Добавляем ID нового изображения в параметры обновления
        updateFields.shopImage = createdImage._id;
      }
      
      // Обновляем магазин в рамках транзакции
      // Используем populate для currentShift, чтобы получить информацию о текущей смене, если она есть
      const updatedShop = await this.shopModel.findOneAndUpdate(
        { _id: new Types.ObjectId(shopId), owner: foundSeller._id },
        updateFields,
        { new: true, session }
      )
      .populate({
        path: 'currentShift',
        select: 'shiftId openedAt closedAt openedBy closedBy statistics'
      })
      .lean({ virtuals: true })
      .exec();
      
      if (!updatedShop) throw new NotFoundException('Магазин не найден');
      
      // Если загрузили новое изображение и есть старое - регистрируем старое для удаления
      if (updateFields.shopImage && oldImageId) {
        // Используем метод deleteFile с поддержкой сессий
        await this.uploadsService.deleteFile(oldImageId.toString(), session);
      }
      
      // Фиксируем изменения
      await session.commitTransaction();

      // Создаем детальное сообщение лога с обновленными данными
      const logDetails = [
        `Продавец ${foundSeller._id.toString()} обновил магазин ${updatedShop._id.toString()}`,
        dto.aboutShop ? 'Описание: обновлено' : '',
        dto.openAt || dto.closeAt ? `Часы работы: ${dto.openAt ? `открытие в ${dto.openAt}` : ''}${dto.closeAt ? `${dto.openAt ? ', ' : ''}закрытие в ${dto.closeAt}` : ''}` : '',
        dto.minOrderSum ? `Мин. сумма заказа: ${foundShop.minOrderSum} → ${updatedShop.minOrderSum}` : '',
        updateFields.shopImage ? 'Изображение: обновлено' : ''
      ].filter(item => item !== '').join('; ');
      
      // Добавляем лог об обновлении магазина
      await this.logsService.addShopLog(updatedShop._id.toString(), LogLevel.LOW, logDetails);

      const sellerLogDetails = [
        `Обновлен магазин "${updatedShop.shopName}" (ID: ${updatedShop._id.toString()})`,
        dto.aboutShop ? 'Описание: обновлено' : '',
        dto.openAt || dto.closeAt ? `Часы работы: ${dto.openAt ? `открытие в ${dto.openAt}` : ''}${dto.closeAt ? `${dto.openAt ? ', ' : ''}закрытие в ${dto.closeAt}` : ''}` : '',
        dto.minOrderSum ? `Мин. сумма заказа: ${foundShop.minOrderSum} → ${updatedShop.minOrderSum}` : '',
        updateFields.shopImage ? 'Изображение: обновлено' : ''
      ].filter(item => item !== '').join('; ');
      
      // Добавляем лог для продавца
      await this.logsService.addSellerLog(foundSeller._id.toString(), LogLevel.LOW, sellerLogDetails);
      
      // Получаем полные данные обновленного магазина
      return this.getFullShop(authedSeller, shopId);
    } catch (error) {
      // Отменяем транзакцию в случае ошибки
      await session.abortTransaction();
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof InternalServerErrorException ||
          error instanceof ForbiddenException) {
        throw error;
      }
      
      console.error('Ошибка при обновлении магазина:', error);
      throw new InternalServerErrorException('Не удалось обновить магазин');
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }



  // ====================================================
  // PINNED EMPLOYEES 
  // ====================================================
  async getPinnedEmployees(shopId: string, authedSeller: AuthenticatedUser): Promise<EmployeeForSellerResponseDto[]> {
    checkId([shopId]);
    const shop = await this.shopModel.findById(new Types.ObjectId(shopId)).select('_id owner pinnedEmployees').populate('pinnedEmployees').lean({ virtuals: true }).exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    if (!shop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');

    return plainToInstance(EmployeeForSellerResponseDto, shop.pinnedEmployees, { excludeExtraneousValues: true });
  }
  

  async unpinEmployeeFromShop(shopId: string, employeeId: string, authedSeller: AuthenticatedUser): Promise<MessageResponseDto> {
    checkId([shopId]);
    const shop = await this.shopModel.findById(new Types.ObjectId(shopId)).select('_id owner currentShift').populate('currentShift', 'openedBy').lean({ virtuals: true }).exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    if (!shop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');

    const employee = await this.employeeModel.findById(new Types.ObjectId(employeeId)).lean().exec();
    if (!employee) throw new NotFoundException('Сотрудник не найден');
    if (!employee.pinnedTo) throw new ForbiddenException('Сотрудник не закреплен');
    if (employee.pinnedTo.toString() !== shop._id.toString()) throw new ForbiddenException('Сотрудник не закреплен');

    // Проверяем, является ли сотрудник открывателем текущей смены
    // @ts-ignore
    if (shop.currentShift && shop.currentShift.openedBy && shop.currentShift.openedBy.employee.toString() === employeeId) {
      throw new ForbiddenException('Нельзя открепить сотрудника, который является открывателем текущей смены');
    }
    
    await this.employeeModel.findByIdAndUpdate(employee._id, { pinnedTo: null }).exec();
    return { message: 'Сотрудник откреплен от магазина' };
  }




  // ====================================================
  // SHIFTS 
  // ====================================================
  async getShifts(
    authedSeller: AuthenticatedUser, 
    shopId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShiftForSellerPreviewResponseDto>> {
    checkId([shopId]);
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).select('_id owner').lean().exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    if (!foundShop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');
    
    // Получаем параметры пагинации с значениями по умолчанию
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество смен для пагинации
    const totalItems = await this.shiftModel.countDocuments({ shop: foundShop._id }).exec();
    
    // Получаем смены с пагинацией
    const foundShifts = await this.shiftModel.find({ shop: foundShop._id })
      .sort({ openedAt: -1 }) // -1 для сортировки по убыванию (новые сначала)
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
    const items = plainToInstance(ShiftForSellerPreviewResponseDto, foundShifts, { excludeExtraneousValues: true });
    return { items, pagination };
  }

  async getCurrentShift(authedSeller: AuthenticatedUser, shopId: string): Promise<ShiftForSellerFullResponseDto> {
    checkId([shopId]);
    const foundShop = await this.shopModel.findOne({ _id: new Types.ObjectId(shopId), owner: new Types.ObjectId(authedSeller.id) }).select('_id owner').lean().exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    
    const shift = await this.shiftModel.findOne({ shop: foundShop._id }).sort({ openedAt: -1 }).lean({ virtuals: true }).exec();
    return plainToInstance(ShiftForSellerFullResponseDto, shift, { excludeExtraneousValues: true });
  }
  

  async getShift(authedSeller: AuthenticatedUser, shopId: string, shiftId: string): Promise<ShiftForSellerFullResponseDto> {
    checkId([shopId]);
    const foundShop = await this.shopModel.findOne({ _id: new Types.ObjectId(shopId), owner: new Types.ObjectId(authedSeller.id) }).select('_id owner').lean().exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    
    checkId([shiftId]);
    const shift = await this.shiftModel.findOne({ _id: new Types.ObjectId(shiftId), shop: foundShop._id }).lean({ virtuals: true }).exec();
    if (!shift) throw new NotFoundException('Смена не найден');
    
    return plainToInstance(ShiftForSellerFullResponseDto, shift, { excludeExtraneousValues: true });
  }


  async getShiftLogs(authedSeller: AuthenticatedUser, shopId: string, shiftId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([shopId, shiftId]);
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).select('_id owner').lean().exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    if (!foundShop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');
    
    const shift = await this.shiftModel.findOne({ _id: new Types.ObjectId(shiftId), shop: foundShop._id }).lean({ virtuals: true }).exec();
    if (!shift) throw new NotFoundException('Смена не найден');

    return this.logsService.getAllShiftLogs(shiftId, paginationQuery);
  }


  async getSellerActiveShiftsByTelegramId(telegramId: number): Promise<ShiftForSellerTelegramBotPreviewResponseDto[] | null> {
    // 1. Найти продавца и сразу получить магазины
    const seller = await this.sellerModel
      .findOne({ telegramId })
      .select('_id shops')
      .populate({ path: 'shops', select: '_id' })
      .lean();
    if (!seller || !seller.shops || seller.shops.length === 0) return [];
    const shopIds = seller.shops.map((shop: any) => shop._id);
    // 2. Найти активные смены для всех магазинов продавца
    const activeShifts = await this.shiftModel.find({
      shop: { $in: shopIds },
      closedAt: null
    }).populate('shop', '_id shopName').lean({ virtuals: true }).exec();

    return plainToInstance(ShiftForSellerTelegramBotPreviewResponseDto, activeShifts, { excludeExtraneousValues: true });
  }
    



  // ====================================================
  // SHOP PRODUCTS 
  // ====================================================
  async getShopProducts(
    authedSeller: AuthenticatedUser, 
    shopId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductForSellerResponseDto>> {
    checkId([shopId]);
    const shop = await this.shopModel.findById(new Types.ObjectId(shopId)).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    if (!shop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');
    
    // Получаем параметры пагинации с значениями по умолчанию
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество товаров для пагинации
    const totalItems = await this.shopProductModel.countDocuments({ pinnedTo: shop._id }).exec();
    
    // Получаем товары с пагинацией
    const foundShopProducts = await this.shopProductModel.find({ pinnedTo: shop._id })
      .populate('product')
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
    
    // Преобразуем данные в DTO
    const items = plainToInstance(ShopProductForSellerResponseDto, foundShopProducts, { excludeExtraneousValues: true });
    return { items, pagination };
  }


  async getShopProduct(authedSeller: AuthenticatedUser, shopId: string, shopProductId: string,): Promise<ShopProductForSellerResponseDto> {
    checkId([shopId, shopProductId]);
    const shop = await this.shopModel.findById(new Types.ObjectId(shopId)).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    if (!shop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');

    const foundShopProduct = await this.shopProductModel.findOne({
      pinnedTo: shop._id,
      _id: new Types.ObjectId(shopProductId)
    }).populate([
      { path: 'product' },
      { path: 'images', select: 'imageId createdAt' },
    ]).lean({ virtuals: true }).exec();
    if (!foundShopProduct) throw new NotFoundException('Товар не найден');

    return plainToInstance(ShopProductForSellerResponseDto, foundShopProduct, { excludeExtraneousValues: true });
  }


  async getShopProductLogs(authedSeller: AuthenticatedUser, shopId: string, shopProductId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([shopId, shopProductId]);
    const shop = await this.shopModel.findById(new Types.ObjectId(shopId)).lean().exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    if (!shop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');

    const foundShopProduct = await this.shopProductModel.findOne({pinnedTo: shop._id, _id: new Types.ObjectId(shopProductId)}).lean({ virtuals: true }).exec();
    if (!foundShopProduct) throw new NotFoundException('Товар не найден');

    return this.logsService.getAllShopProductLogs(foundShopProduct._id.toString(), paginationQuery);
  }


  async updateShopProduct(
    authedSeller: AuthenticatedUser, 
    shopId: string, 
    dto: UpdateShopProductBySellerDto
  ): Promise<ShopProductForSellerResponseDto> {
    const foundSeller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id)).select('_id verifiedStatus isBlocked').lean({ virtuals: true }).exec();
    if (!foundSeller) throw new NotFoundException('Продавец не найден');
    verifyUserStatus(foundSeller);

    checkId([shopId, dto.productId]);
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).select('_id owner').lean().exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    if (!foundShop.owner.equals(foundSeller._id)) throw new ForbiddenException('Недостаточно прав');
  
    const foundProduct = await this.productModel.findById(new Types.ObjectId(dto.productId)).select('_id owner').lean().exec();
    if (!foundProduct) throw new NotFoundException('Товар не найден');
    if (foundProduct.owner.toString() !== foundSeller._id.toString()) throw new ForbiddenException('Недостаточно прав');

    const foundShopProduct = await this.shopProductModel.findOne({ 
      pinnedTo: foundShop._id,
      product: foundProduct._id
    }).populate('product').exec();
    
    let updatedShopProduct: any;

    if (foundShopProduct) {
      // Сохраняем старые значения для логирования
      const oldStockQuantity = foundShopProduct.stockQuantity;
      const oldStatus = foundShopProduct.status;
      
      // Если товар уже существует в магазине, обновляем его напрямую
      Object.assign(foundShopProduct, {
        stockQuantity: dto.newStockQuantity || foundShopProduct.stockQuantity,
        status: dto.newStatus || foundShopProduct.status
      });
      
      // Сохраняем изменения
      updatedShopProduct = await foundShopProduct.save();
      
      // Логирование
      await this.logsService.addShopProductLog(foundShopProduct._id.toString(), LogLevel.MEDIUM, 
        `Продавец ${authedSeller.id} изменил товар ${foundShopProduct._id} в магазине ${shopId}. ` + 
        (dto.newStockQuantity !== undefined ? `Количество: ${oldStockQuantity} → ${dto.newStockQuantity}. ` : '') + 
        (dto.newStatus ? `Статус: ${oldStatus} → ${dto.newStatus}.` : '')
      );
    } else {
      // Если товара нет - создаем новую связь между магазином и продуктом
      const newShopProduct = new this.shopProductModel({
        pinnedTo: foundShop._id,
        product: foundProduct._id,
        stockQuantity: dto.newStockQuantity || 0,
        status: dto.newStatus || ShopProductStatus.PAUSED
      });
      
      // Сохраняем и сразу делаем populate
      await newShopProduct.save();
      updatedShopProduct = await this.shopProductModel.findById(newShopProduct._id).populate('product').lean({ virtuals: true }).exec();

      // Логирование
      await this.logsService.addShopProductLog(newShopProduct._id.toString(), LogLevel.MEDIUM,
        `Продавец ${authedSeller.id} добавил новый товар ${newShopProduct.product._id.toString()} в магазин ${foundShop._id.toString()}. ` +
        `Количество: ${dto.newStockQuantity || 0}. ` +
        `Статус: ${dto.newStatus || ShopProductStatus.PAUSED}.`
      );
    };
    
    return this.getShopProduct(authedSeller, shopId, updatedShopProduct.shopProductId);
  }


  async removeProductFromShop(authedSeller: AuthenticatedUser, shopId: string, shopProductId: string): Promise<MessageResponseDto> {
    const foundSeller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id)).select('_id verifiedStatus isBlocked').lean({ virtuals: true }).exec();
    if (!foundSeller) throw new NotFoundException('Продавец не найден');
    verifyUserStatus(foundSeller);

    checkId([shopId, shopProductId]);
    // Добавляем shopName в выборку для логирования
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).select('_id owner shopName').populate('owner').exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    if (!foundShop.owner.equals(foundSeller._id)) throw new ForbiddenException('Недостаточно прав');

    const foundShopProduct = await this.shopProductModel.findOne({
      _id: new Types.ObjectId(shopProductId),
      pinnedTo: foundShop._id,
    }).exec();
    if (!foundShopProduct) throw new NotFoundException('Товар не найден');

    // Используем транзакцию для гарантированного выполнения всех операций
    const session = await this.shopProductModel.db.startSession();

    try {
      session.startTransaction();
      
      // Получаем информацию о продукте для логирования
      const shopProductInfo = await this.shopProductModel.findById(shopProductId)
        .populate('product', 'productId productName')
        .lean()
        .exec();
      
      const productId = shopProductInfo?.product?._id?.toString();
      // Безопасно получаем имя продукта, учитывая возможные типы
      let productName = 'Неизвестный продукт';
      if (shopProductInfo?.product && typeof shopProductInfo.product === 'object') {
        productName = (shopProductInfo.product as any).productName || 'Неизвестный продукт';
      }
      
      // Удаляем логи продукта через сервис логов
      await this.logsService.deleteAllShopProductLogs(shopProductId, session);
      
      // Удаляем сам продукт из магазина
      await this.shopProductModel.findByIdAndDelete(shopProductId).session(session).exec();
      
      // Логируем удаление продукта в магазине
      await this.logsService.addShopLog(shopId, LogLevel.MEDIUM, 
        `Продавец (${authedSeller.id}) удалил продукт "${productName}" из магазина`
      );
      
      // Логируем действие в записи продукта
      if (productId) {
        await this.logsService.addProductLog(productId, LogLevel.MEDIUM, 
          `Продавец (${authedSeller.id}) удалил продукт из магазина "${foundShop.shopName || foundShop._id.toString()}"`
        );
      }
      
      // Фиксируем изменения
      await session.commitTransaction();
      
      return { message: 'Товар удален из магазина' };
    } catch (error) {
      // В случае ошибки отменяем все изменения
      await session.abortTransaction();
      console.error('Ошибка при удалении продукта из магазина:', error);
      throw new InternalServerErrorException('Ошибка при удалении продукта из магазина');
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }


  async removeShopProductImage(
    authedSeller: AuthenticatedUser,
    shopId: string,
    shopProductId: string,
    imageId: string
  ): Promise<MessageResponseDto> {
    checkId([shopProductId, imageId, shopId]);
    // Получаем сессию MongoDB для транзакций
    const session = await this.shopModel.db.startSession();

    try {
      // Начинаем транзакцию
      session.startTransaction();


      // Находим продавца в рамках транзакции
      const foundSeller = await this.sellerModel
        .findById(new Types.ObjectId(authedSeller.id))
        .select('_id verifiedStatus isBlocked')
        .session(session)
        .lean()
        .exec();

      if (!foundSeller) throw new NotFoundException('Продавец не найден');
      verifyUserStatus(foundSeller);

      // Проверяем наличие магазина и права на него
      const foundShop = await this.shopModel
        .findOne({ _id: new Types.ObjectId(shopId), seller: foundSeller._id })
        .select('_id owner')
        .session(session)
        .lean()
        .exec();

      if (!foundShop) throw new NotFoundException('Магазин не найден или не принадлежит данному продавцу');

      // Находим продукт в магазине
      const shopProduct = await this.shopProductModel
        .findOne({ _id: new Types.ObjectId(shopProductId), shop: foundShop._id })
        .session(session)
        .exec();

      if (!shopProduct) throw new NotFoundException('Продукт в магазине не найден');

      // Проверяем, существует ли указанное изображение в массиве images
      const imageIndex = shopProduct.images.findIndex(img => img.toString() === imageId);
      
      if (imageIndex === -1) throw new NotFoundException('Изображение не найдено в данном продукте');
      
      // Удаляем изображение из базы данных и файловой системы
      await this.uploadsService.deleteFile(imageId, session);
      
      // Удаляем ссылку на изображение из массива images
      shopProduct.images.splice(imageIndex, 1);
      
      // Сохраняем обновленный продукт в рамках транзакции
      await shopProduct.save({ session });
      
      // Добавляем запись в лог магазина
      await this.logsService.addShopProductLog(shopProduct._id.toString(), LogLevel.LOW,
        `Удалено изображение (ID: ${imageId}) продукта ${shopProduct.product.toString()}`,
        session
      );
      
      // Фиксируем транзакцию
      await session.commitTransaction();
      
      return plainToInstance(MessageResponseDto, { 
        message: 'Изображение продукта успешно удалено' 
      });
    } catch (error) {
      // Отменяем транзакцию при ошибке
      await session.abortTransaction();
      
      // Пробрасываем известные типы ошибок
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      console.error('Ошибка при удалении изображения продукта:', error);
      throw new InternalServerErrorException('Ошибка при удалении изображения продукта');
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }



}