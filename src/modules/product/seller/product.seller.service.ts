import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { plainToInstance } from "class-transformer";
import {
  CreateProductDto,
  UpdateProductDto,
} from "./product.seller.request.dto";
import { ProductPreviewResponseDto, ProductFullResponseDto, ProductOfShopResponseDto } from "./product.seller.response.dtos";
import { checkId, transformPaginatedResult, verifyUserStatus } from "src/common/utils";
import { ProductModel } from "../product.schema";
import { SellerModel } from "src/modules/seller/seller.schema";
import { LogsService } from "src/common/modules/logs/logs.service";
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { MessageResponseDto, PaginatedResponseDto, PaginationQueryDto } from "src/common/dtos";
import { UploadsService } from "src/common/modules/uploads/uploads.service";
import { UserType } from "src/common/types";
import { EntityType, ImageType } from "src/common/modules/uploads/uploaded-file.schema";
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedLogDto } from "src/common/modules/logs/logs.dtos";

@Injectable()
export class ProductSellerService {
  constructor(
    @InjectModel('Product') private productModel: ProductModel,
    @InjectModel('Seller') private sellerModel: SellerModel,
    private readonly logsService: LogsService,
    private readonly uploadsService: UploadsService
  ) { }

  async createProduct(
    authedSeller: AuthenticatedUser,
    dto: CreateProductDto,
    cardImage?: Express.Multer.File
  ): Promise<ProductFullResponseDto> {
    const session = await this.productModel.db.startSession();
    let newImageIdForCompensation: string | null = null;

    try {
      return await session.withTransaction(async () => {
        // 1) проверка продавца
        const seller = await this.sellerModel.findById(authedSeller.id).select('_id verifiedStatus isBlocked').session(session).lean().exec();
        if (!seller) throw new NotFoundException('Продавец не найден');
        verifyUserStatus(seller);

        // 2) создание продукта (save → сработают pre/post save)
        const product = await new this.productModel({
          productName: dto.productName,
          price: dto.price,
          stepRate: dto.stepRate,
          aboutProduct: dto.aboutProduct ?? null,
          origin: dto.origin ?? null,
          productArticle: dto.productArticle ?? null,
          owner: seller._id,
          cardImage: null,
        }).save({ session });

        // 3) опциональная загрузка изображения
        if (cardImage) {
          const createdImage = await this.uploadsService.uploadImage({
            file: cardImage,
            accessLevel: 'public',
            entityType: EntityType.product,
            entityId: product._id.toString(),
            imageType: ImageType.productCardImage,
            allowedUsers: [{ userId: seller._id.toString(), role: UserType.SELLER }],
            session,
          });
          newImageIdForCompensation = createdImage._id.toString();

          product.cardImage = createdImage._id;
          await product.save({ session });
        }

        // 4) лог
        await this.logsService.addProductLog(
          product._id.toString(),
          LogLevel.LOW,
          `Создан продукт ${product.productName}`,
          session
        );

        return this.getProduct(authedSeller, product._id.toString());
      });

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
      throw new InternalServerErrorException('Не удалось создать продукт');
    } finally {
      session.endSession();
    }
  }


  async updateProduct(
    authedSeller: AuthenticatedUser,
    productId: string,
    dto: UpdateProductDto,
    cardImage?: Express.Multer.File
  ): Promise<ProductFullResponseDto> {
    checkId([productId]);
    const session = await this.productModel.db.startSession();
    let createdImageIdForCompensation: string | null = null;

    try {
      return await session.withTransaction(async () => {
        // 1) Проверка продавца
        const seller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id)).select('_id verifiedStatus isBlocked').session(session).lean().exec();
        if (!seller) throw new NotFoundException('Продавец не найден');
        verifyUserStatus(seller);

        // 2) Берём «живой» документ продукта (не lean)
        const product = await this.productModel
          .findOne({ _id: new Types.ObjectId(productId), owner: new Types.ObjectId(authedSeller.id) })
          .session(session);
        if (!product) throw new NotFoundException('Продукт не найден');

        // Снимок старых значений для лога
        const old = {
          productName: product.productName,
          price: product.price,
          stepRate: product.stepRate,
          aboutProduct: product.aboutProduct,
          origin: product.origin,
          productArticle: product.productArticle,
          cardImage: product.cardImage as Types.ObjectId | null,
        };

        // 3) Вайтлист обновляемых полей (обновляем только если переданы)
        if (dto.productName !== undefined) product.productName = dto.productName;
        if (dto.price !== undefined) product.price = dto.price;
        if (dto.stepRate !== undefined) product.stepRate = dto.stepRate;
        if (dto.aboutProduct !== undefined) product.aboutProduct = dto.aboutProduct ?? null;
        if (dto.origin !== undefined) product.origin = dto.origin ?? null;
        if (dto.productArticle !== undefined) product.productArticle = dto.productArticle ?? null;

        // 4) Опциональная загрузка новой карточки
        if (cardImage) {
          const uploaded = await this.uploadsService.uploadImage({
            file: cardImage,
            accessLevel: 'public',
            entityType: EntityType.product,
            entityId: product._id.toString(),
            imageType: ImageType.productCardImage,
            allowedUsers: [{ userId: seller._id.toString(), role: UserType.SELLER }],
            session,
          });
          createdImageIdForCompensation = uploaded._id.toString();
          product.cardImage = uploaded._id;
        }

        // 5) Сохраняем документ (сработают pre/post save хуки)
        if (product.isModified()) await product.save({ session });

        // 6) Удаляем старую картинку, если реально сменили
        if (cardImage && old.cardImage) await this.uploadsService.deleteFile(old.cardImage.toString(), session);

        // 7) Логируем изменения (по разнице)
        const changes: string[] = [];
        if (dto.productName && dto.productName !== old.productName) changes.push(`Название: c "${old.productName}" на "${dto.productName}"`);
        if (dto.price !== undefined && dto.price !== old.price) changes.push(`Цена: с ${old.price} на ${dto.price}`);
        if (dto.stepRate && dto.stepRate !== old.stepRate) changes.push(`Шаг: с ${old.stepRate} на ${dto.stepRate}`);
        if (dto.aboutProduct !== undefined) changes.push('Описание: изменено');
        if (dto.origin !== undefined && dto.origin !== old.origin) changes.push(`Происхождение: с "${old.origin ?? '-'}" на "${dto.origin ?? '-'}"`);
        if (dto.productArticle !== undefined && dto.productArticle !== old.productArticle) changes.push(`Артикул: с "${old.productArticle ?? '-'}" на "${dto.productArticle ?? '-'}"`);
        if (cardImage) changes.push('Карточка: обновлена');

        await this.logsService.addProductLog(
          product._id.toString(),
          LogLevel.LOW,
          `Продавец обновил продукт ${product._id}: ${changes.join('; ')}`,
          session
        );
        return this.getProduct(authedSeller, productId);
      });


    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;

      console.error('Ошибка при обновлении продукта:', error);
      throw new InternalServerErrorException('Не удалось обновить продукт');
    } finally {
      session.endSession();
    }
  }


  async deleteProduct(authedSeller: AuthenticatedUser, productId: string): Promise<MessageResponseDto> {
    checkId([productId]);

    const session = await this.productModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        const foundSeller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id)).select('_id verifiedStatus isBlocked').session(session).lean().exec();
        if (!foundSeller) throw new NotFoundException('Продавец не найден');
        verifyUserStatus(foundSeller);

        const foundProduct = await this.productModel.findOne({ _id: new Types.ObjectId(productId), owner: foundSeller._id }).session(session).lean({ virtuals: true }).exec();
        if (!foundProduct) throw new NotFoundException('Продукт не найден');

        if (foundProduct.cardImage) await this.uploadsService.deleteFile(foundProduct.cardImage.toString(), session);
        await this.logsService.deleteAllProductLogs(foundProduct._id.toString(), session);
        await this.productModel.findByIdAndDelete(foundProduct._id).session(session).exec();
      });
      return plainToInstance(MessageResponseDto, { message: 'Продукт успешно удален' });
      
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;

      console.error('Ошибка при удалении продукта:', error);
      throw new InternalServerErrorException('Не удалось удалить продукт');
    } finally {
      session.endSession();
    }
  }


  async getProducts(
    authedSeller: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ProductPreviewResponseDto>> {
    const { page, pageSize } = paginationQuery;
    const result = await this.productModel.paginate({ owner: new Types.ObjectId(authedSeller.id) }, { page, limit: pageSize });
    return transformPaginatedResult(result, ProductPreviewResponseDto);
  }


  async getProduct(authedSeller: AuthenticatedUser, productId: string): Promise<ProductFullResponseDto> {
    const foundProduct = await this.productModel.findOne({ _id: new Types.ObjectId(productId), owner: new Types.ObjectId(authedSeller.id) })
      .populate({
        path: 'shopProducts',
        select: 'shopProductId pinnedTo stockQuantity status last7daysSales last7daysWriteOff',
        populate: { path: 'pinnedTo', select: 'shopId shopImage shopName' }
      }).lean({ virtuals: true }).exec();

    if (!foundProduct) throw new NotFoundException('Продукт не найден');
    return plainToInstance(ProductFullResponseDto, foundProduct, { excludeExtraneousValues: true });
  }


  async getSellerProductLogs(authedSeller: AuthenticatedUser, productId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    const foundProduct = await this.productModel.exists({ _id: new Types.ObjectId(productId), owner: new Types.ObjectId(authedSeller.id) }).lean().exec();
    if (!foundProduct) throw new NotFoundException('Продукт не найден');
    return this.logsService.getAllProductLogs(foundProduct._id.toString(), paginationQuery);
  }


  async getProductsOfShops(
    authedSeller: AuthenticatedUser,
    paginationQuery: PaginationQueryDto,
    shopId: string
  ): Promise<PaginatedResponseDto<ProductOfShopResponseDto>> {
    checkId([shopId]);
    const { page = 1, pageSize = 10 } = paginationQuery;

    // Ищем продавца и проверяем его существование
    const foundSeller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id)).lean().exec();
    if (!foundSeller) throw new NotFoundException('Продавец не найден');

    const paginateOptions = {
      page,
      limit: pageSize,
      lean: true,
      populate: {
        path: 'shopProducts',
        select: 'shopProductId pinnedTo stockQuantity status last7daysSales last7daysWriteOff',
        match: shopId && Types.ObjectId.isValid(shopId)
          ? { pinnedTo: new Types.ObjectId(shopId) }
          : { _id: { $exists: false } }
      },
      sort: { createdAt: -1 }, // Сортировка по дате создания (новые первыми)
      leanWithId: false // Для поддержки виртуальных полей
    };

    const result = await this.productModel.paginate({ owner: foundSeller._id }, paginateOptions);

    return transformPaginatedResult(result, ProductOfShopResponseDto);
  }
}