import { Injectable, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UploadsService } from 'src/common/modules/uploads/uploads.service';
import { PaginationQueryDto, PaginationMetaDto, PaginatedResponseDto } from "src/common/dtos";
import { plainToInstance } from 'class-transformer';
import { UpdateShopProductDto } from './shop-product.seller.request.dto';
import { SellerModel } from 'src/modules/seller/seller.schema';
import { verifyUserStatus } from 'src/common/utils';
import { ShopProductModel, ShopProductStatus } from "src/modules/shop/shop-product/shop-product.schema";
import { ShopProductResponseDto } from './shop-product.seller.response.dto';
import { ProductModel } from 'src/modules/product/product.schema';
import { MessageResponseDto } from 'src/common/dtos';
import {checkId} from 'src/common/utils';
import { LogsService } from 'src/common/modules/logs/logs.service';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';
import { ShopModel } from '../../shop/shop.schema';

@Injectable()
export class ShopProductSellerService {
  constructor(
    @InjectModel('Seller') private sellerModel: SellerModel,
    @InjectModel('Shop') private shopModel: ShopModel,
    @InjectModel('ShopProduct') private shopProductModel: ShopProductModel,
    @InjectModel('Product') private productModel: ProductModel,
    private readonly logsService: LogsService,
    private readonly uploadsService: UploadsService
  ) {}


  async getShopProducts(
    authedSeller: AuthenticatedUser, 
    shopId: string, 
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
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
    const items = plainToInstance(ShopProductResponseDto, foundShopProducts, { excludeExtraneousValues: true });
    return { items, pagination };
  }


  async getShopProduct(authedSeller: AuthenticatedUser, shopId: string, shopProductId: string,): Promise<ShopProductResponseDto> {
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

    return plainToInstance(ShopProductResponseDto, foundShopProduct, { excludeExtraneousValues: true });
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
    dto: UpdateShopProductDto
  ): Promise<ShopProductResponseDto> {
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
};
