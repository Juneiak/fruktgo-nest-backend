import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { plainToInstance } from "class-transformer";
import {
  CreateProductDto,
  ProductForSellerPreviewResponseDto,
  ProductForSellerFullResponseDto,
  UpdateProductDto,
  ProductForSellerOfShopResponseDto
} from "./product-for-seller.dtos";
import { checkId, verifyUserStatus } from "src/common/utils";
import { Product } from "../product.schema";
import { Seller } from "src/modules/seller/seller.schema";
import { LogsService } from "src/common/modules/logs/logs.service";
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { MessageResponseDto, PaginatedResponseDto, PaginationMetaDto, PaginationQueryDto } from "src/common/dtos";
import { UploadsService } from "src/common/modules/uploads/uploads.service";
import { UserType } from "src/common/types";
import { EntityType, ImageType } from "src/common/modules/uploads/uploaded-file.schema";
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedLogDto } from "src/common/modules/logs/logs.dtos";

@Injectable()
export class ProductForSellerService {
  constructor(
    @InjectModel('Product') private productModel: Model<Product>,
    @InjectModel('Seller') private sellerModel: Model<Seller>,
    private readonly logsService: LogsService,
    private readonly uploadsService: UploadsService
  ) {}

  // ====================================================
  // PRODUCTS 
  // ====================================================

  async createProduct(
    authedSeller: AuthenticatedUser, 
    dto: CreateProductDto, 
    cardImage?: Express.Multer.File
  ): Promise<ProductForSellerPreviewResponseDto> {
    // Получаем сессию из соединения с MongoDB для транзакций
    const session = await this.productModel.db.startSession();

    try {
      // Начинаем транзакцию
      session.startTransaction();
      
      // Находим продавца в рамках транзакции
      const foundSeller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id)).select('_id verifiedStatus isBlocked').session(session).lean().exec();
      if (!foundSeller) throw new NotFoundException('Продавец не найден');
      verifyUserStatus(foundSeller);

      // Создаем продукт внутри транзакции
      // Используем метод create с массивом и опцией session
      const product = await this.productModel.create([{
        ...dto,
        owner: foundSeller._id,
      }], { session }).then(docs => docs[0]);
      
      if (!product) throw new NotFoundException('Не удалось создать продукт');

      // Если есть изображение, загружаем его в рамках транзакции
      if (cardImage) {
        const createdImage = await this.uploadsService.uploadImage({
          file: cardImage,
          accessLevel: 'public',
          entityType: EntityType.product,
          entityId: product._id.toString(),
          imageType: ImageType.productCardImage,
          allowedUsers: [{ userId: foundSeller._id.toString(), role: UserType.SELLER }],
          session // Передаем сессию в метод uploadImage
        });
        
        
        // Обновляем продукт в рамках транзакции
        const updatedProduct = await this.productModel.findByIdAndUpdate(
          product._id,
          { cardImage: createdImage._id },
          { session, new: true }
        ).exec();
      }

      // Добавляем лог о создании продукта в рамках транзакции
      await this.logsService.addProductLog(product._id.toString(), LogLevel.LOW,
        `Создан продукт ${product.productName}`,
        session
      );

      // Фиксируем изменения
      await session.commitTransaction();
      
      // Получаем обновленный продукт (с изображением)
      const updatedProduct = await this.productModel.findById(product._id).lean({ virtuals: true }).exec();
      return plainToInstance(ProductForSellerPreviewResponseDto, updatedProduct, { excludeExtraneousValues: true });
    } catch (error) {
      // Отменяем все изменения при любой ошибке
      await session.abortTransaction();
      
      // Логируем ошибку и пробрасываем её дальше с понятным сообщением
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('Ошибка при создании продукта:', error);
      throw new InternalServerErrorException('Не удалось создать продукт');
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }

  //TODO: обнови через сессии 
  async updateProduct(
    productId: string, 
    authedSeller: AuthenticatedUser, 
    dto: UpdateProductDto, 
    cardImage?: Express.Multer.File
  ): Promise<ProductForSellerPreviewResponseDto> {
    // Получаем сессию из соединения с MongoDB для транзакций
    const session = await this.productModel.db.startSession();
    
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
      
      // Проверяем и находим продукт в рамках транзакции
      checkId([productId]);
      const foundProduct = await this.productModel.findOne({ 
        _id: new Types.ObjectId(productId), 
        owner: foundSeller._id 
      }).session(session).lean().exec();
      
      if (!foundProduct) throw new NotFoundException('Продукт не найден');
      
      // Сохраняем старый ID изображения, если есть
      const oldImageId = foundProduct.cardImage || null;
      
      // Обновляем базовые данные продукта
      const updateFields: any = {...dto};
      
      // Обработка изображения, если оно есть
      if (cardImage) {
        // Загружаем изображение в рамках транзакции
        const createdImage = await this.uploadsService.uploadImage({
          file: cardImage,
          accessLevel: 'public',
          entityType: EntityType.product,
          entityId: foundProduct._id.toString(),
          imageType: ImageType.productCardImage,
          allowedUsers: [{ userId: foundSeller._id.toString(), role: UserType.SELLER }],
          session // Передаем сессию в метод uploadImage
        });
        
        // Добавляем ID нового изображения в параметры обновления
        updateFields.cardImage = createdImage._id;
      }
      
      // Обновляем продукт в рамках транзакции
      const updatedProduct = await this.productModel.findOneAndUpdate(
        { _id: new Types.ObjectId(productId), owner: foundSeller._id },
        updateFields,
        { new: true, session }
      ).lean({ virtuals: true }).exec();
      
      if (!updatedProduct) throw new NotFoundException('Продукт не найден');
      
      // Если загрузили новое изображение и есть старое - регистрируем старое для удаления
      if (updateFields.cardImage && oldImageId) {
        // Используем новый метод deleteFile с поддержкой сессий
        // Файл будет физически удален только после успешного завершения транзакции
        await this.uploadsService.deleteFile(oldImageId.toString(), session);
      }

      // Добавляем лог о обновлении продукта в рамках транзакции
      await this.logsService.addProductLog(updatedProduct._id.toString(), LogLevel.LOW, 
        `Продавец обновил продукт ${updatedProduct._id.toString()}` +
        `${dto.productName ? ` Название: c ${foundProduct.productName} на ${updatedProduct.productName}` : ''}` +
        `${dto.price ? ` Цена: ${foundProduct.price} на ${updatedProduct.price}` : ''}` +
        `${dto.stepRate ? ` Шаг: ${foundProduct.stepRate} на ${updatedProduct.stepRate}` : ''}` +
        `${dto.aboutProduct ? ` Описание: изменено` : ''}` +
        `${dto.origin ? ` Происхождение: ${foundProduct.origin} на ${updatedProduct.origin}` : ''}` +
        `${updateFields.cardImage ? ` Карточка: обновлена` : ''}` +
        `${dto.productArticle ? ` Артикул: ${foundProduct.productArticle} на ${updatedProduct.productArticle}` : ''}`,
        session
      );

      // Фиксируем изменения
      await session.commitTransaction();
      
      return plainToInstance(ProductForSellerPreviewResponseDto, updatedProduct, { excludeExtraneousValues: true });
    } catch (error) {
      // Отменяем все изменения при любой ошибке
      await session.abortTransaction();
      
      // Логируем ошибку и пробрасываем её дальше с понятным сообщением
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      
      console.error('Ошибка при обновлении продукта:', error);
      throw new InternalServerErrorException('Не удалось обновить продукт');
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }

  
  async deleteProduct(productId: string, authedSeller: AuthenticatedUser): Promise<MessageResponseDto> {
    // Получаем сессию MongoDB для транзакций
    const session = await this.productModel.db.startSession();
    
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
      
      // Проверяем существование продукта и права на него в рамках транзакции
      checkId([productId]);
      const foundProduct = await this.productModel.findOne({ 
        _id: new Types.ObjectId(productId), 
        owner: foundSeller._id
      }).session(session).lean({ virtuals: true }).exec();
      
      if (!foundProduct) throw new NotFoundException('Продукт не найден');
      
      // Если у продукта есть изображение, удаляем его в рамках транзакции
      if (foundProduct.cardImage) {
        await this.uploadsService.deleteFile(foundProduct.cardImage.toString(), session);
      }
      
      // Удаляем все логи продукта в рамках транзакции
      await this.logsService.deleteAllProductLogs(foundProduct._id.toString(), session);
      
      // Удаляем продукт в рамках транзакции
      await this.productModel.findByIdAndDelete(foundProduct._id).session(session).exec();
      
      // TODO: Удаление привязанных продуктов в магазине (можно добавить дополнительные операции в эту транзакцию)
      
      // Фиксируем транзакцию
      await session.commitTransaction();
      
      return plainToInstance(MessageResponseDto, { message: 'Продукт успешно удален' });
    } catch (error) {
      // Отменяем транзакцию при ошибке
      await session.abortTransaction();
      
      // Пробрасываем соответствующие типы ошибок
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      
      console.error('Ошибка при удалении продукта:', error);
      throw new InternalServerErrorException('Не удалось удалить продукт');
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }


  async getAllSellerProducts(
    authedSeller: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ProductForSellerPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Ищем продавца и проверяем его существование
    const foundSeller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id)).lean().exec();
    if (!foundSeller) throw new NotFoundException('Продавец не найден');
    
    // Получаем продукты с пагинацией
    const totalItems = await this.productModel.countDocuments({ owner: foundSeller._id });
    const products = await this.productModel
      .find({ owner: foundSeller._id })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    // Формируем метаданные пагинации
    const totalPages = Math.ceil(totalItems / pageSize);
    const pagination = {totalItems, totalPages, currentPage: page, pageSize};
    
    const items = plainToInstance(ProductForSellerPreviewResponseDto, products, { excludeExtraneousValues: true });
    return {items, pagination};
  }


  async getSellerProduct(authedSeller: AuthenticatedUser, productId: string): Promise<ProductForSellerFullResponseDto> {
    checkId([productId]);
    const foundProduct = await this.productModel.findOne({ _id: new Types.ObjectId(productId), owner: new Types.ObjectId(authedSeller.id)})
    .populate({
      path: 'shopProducts',
      select: 'shopProductId pinnedTo stockQuantity status last7daysSales last7daysWriteOff', 
      populate: { path: 'pinnedTo', select: 'shopId shopImage shopName' }
    })
    .lean({ virtuals: true })
    .exec();
    if (!foundProduct) throw new NotFoundException('Продукт не найден');
    return plainToInstance(ProductForSellerFullResponseDto, foundProduct, { excludeExtraneousValues: true });
  }

  async getSellerProductLogs(authedSeller: AuthenticatedUser, productId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([productId]);
    const foundProduct = await this.productModel.findOne({ _id: new Types.ObjectId(productId), owner: new Types.ObjectId(authedSeller.id)}).lean().exec();
    if (!foundProduct) throw new NotFoundException('Продукт не найден');
    return this.logsService.getAllProductLogs(foundProduct._id.toString(), paginationQuery);
  }


  async getProductsOfShops(
    authedSeller: AuthenticatedUser,
    paginationQuery: PaginationQueryDto,
    shopId?: string
  ): Promise<PaginatedResponseDto<ProductForSellerOfShopResponseDto>> { 
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Ищем продавца и проверяем его существование
    const foundSeller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id)).lean().exec();
    if (!foundSeller) throw new NotFoundException('Продавец не найден');
    
    // Получаем продукты с пагинацией
    const totalItems = await this.productModel.countDocuments({ owner: foundSeller._id });
    const products = await this.productModel
      .find({ owner: foundSeller._id })
      .populate({
        path: 'shopProducts',
        select: 'shopProductId pinnedTo stockQuantity status last7daysSales last7daysWriteOff',
        match: shopId && Types.ObjectId.isValid(shopId)
          ? { pinnedTo: new Types.ObjectId(shopId) }
          : { _id: { $exists: false } }
      })
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    // Формируем метаданные пагинации
    const totalPages = Math.ceil(totalItems / pageSize);
    const pagination = {totalItems, totalPages, currentPage: page, pageSize};
    
    const items = plainToInstance(ProductForSellerOfShopResponseDto, products, { excludeExtraneousValues: true });
    return {items, pagination};
  }


}