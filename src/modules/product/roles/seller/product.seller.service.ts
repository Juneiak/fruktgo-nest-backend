import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { plainToInstance } from "class-transformer";
import {
  CreateProductDto,
  UpdateProductDto,
} from "./product.seller.request.dtos";
import { ProductPreviewResponseDto, ProductFullResponseDto, ProductOfShopResponseDto } from "./product.seller.response.dtos";
import { checkEntityStatus, checkId, transformPaginatedResult } from "src/common/utils";
import { ProductModel } from "../../product.schema";
import { SellerModel } from "src/modules/seller/seller.schema";
import { LogsService } from "src/common/modules/logs/logs.service";
import { LogLevel } from "src/common/modules/logs/logs.schema";
import { MessageResponseDto, PaginatedResponseDto, PaginationQueryDto } from "src/common/dtos";
import { UploadsService } from "src/common/modules/uploads/uploads.service";
import { UserType } from "src/common/enums/common.enum";
import { EntityType, ImageType } from "src/common/modules/uploads/uploaded-file.schema";
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedLogDto } from "src/common/modules/logs/logs.response.dto";

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
    try {
      const createdProductId = await session.withTransaction(async () => {
        // 1) проверка продавца
        const okSeller = await checkEntityStatus(
          this.sellerModel,
          { _id: new Types.ObjectId(authedSeller.id) },
          { session }
        );
        if (!okSeller) throw new NotFoundException('Продавец не найден');

        // 2) создание продукта (save → сработают pre/post save)
        const createdProduct = new this.productModel({
          productName: dto.productName,
          price: dto.price,
          stepRate: dto.stepRate,
          aboutProduct: dto.aboutProduct ?? null,
          origin: dto.origin ?? null,
          productArticle: dto.productArticle ?? null,
          owner: new Types.ObjectId(authedSeller.id),
          cardImage: null,
        });
        await createdProduct.save({ session });

        // 3) опциональная загрузка изображения
        if (cardImage) {
          const createdImage = await this.uploadsService.uploadImage({
            file: cardImage,
            accessLevel: 'public',
            entityType: EntityType.product,
            entityId: createdProduct._id.toString(),
            imageType: ImageType.productCardImage,
            allowedUsers: [{ userId: authedSeller.id, role: UserType.SELLER }],
            session,
          });
          createdProduct.cardImage = createdImage._id;
          await createdProduct.save({ session });
        }

        // 4) лог
        await this.logsService.addProductLog(
          createdProduct._id.toString(),
          `Создан продукт ${createdProduct.productName}`,
          { forRoles: [UserType.SELLER], logLevel: LogLevel.LOW, session,}
        );
        return createdProduct._id.toString();
      });

      if (!createdProductId) throw new NotFoundException('Не удалось создать продукт');
      return this.getProduct(authedSeller, createdProductId);

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
    try {
      const updatedProductId = await session.withTransaction(async () => {
        // 1) Проверка продавца
        const okSeller = await checkEntityStatus(
          this.sellerModel,
          { _id: new Types.ObjectId(authedSeller.id) },
          { session }
        );
        if (!okSeller) throw new NotFoundException('Продавец не найден');

        // 2) Берём «живой» документ продукта (не lean)
        const product = await this.productModel.findOne({ _id: new Types.ObjectId(productId), owner: new Types.ObjectId(authedSeller.id) }).session(session);
        if (!product) throw new NotFoundException('Продукт не найден');

        // Снимок старых значений для лога
        const old = product.toObject();
        const changes: string[] = [];
        // 3) Вайтлист обновляемых полей (обновляем только если переданы)
        if (dto.productName !== undefined) {
          product.productName = dto.productName;
          changes.push(`Название: c "${old.productName}" на "${dto.productName}"`);
        }
        if (dto.price !== undefined) {
          product.price = dto.price;
          changes.push(`Цена: с ${old.price} на ${dto.price}`);
        }
        if (dto.stepRate !== undefined) {
          product.stepRate = dto.stepRate;
          changes.push(`Шаг: с ${old.stepRate} на ${dto.stepRate}`);
        }
        if (dto.aboutProduct !== undefined) {
          product.aboutProduct = dto.aboutProduct ?? null;
          changes.push('Описание: изменено');
        }
        if (dto.origin !== undefined) {
          product.origin = dto.origin ?? null;
          changes.push(`Происхождение: с "${old.origin ?? '-'}" на "${dto.origin ?? '-'}"`);
        }
        if (dto.productArticle !== undefined) {
          product.productArticle = dto.productArticle ?? null;
          changes.push(`Артикул: с "${old.productArticle ?? '-'}" на "${dto.productArticle ?? '-'}"`);
        }
        // 4) Опциональная загрузка новой карточки
        if (cardImage) {
          const uploaded = await this.uploadsService.uploadImage({
            file: cardImage,
            accessLevel: 'public',
            entityType: EntityType.product,
            entityId: product._id.toString(),
            imageType: ImageType.productCardImage,
            allowedUsers: [{ userId: authedSeller.id, role: UserType.SELLER }],
            session,
          });
          product.cardImage = uploaded._id;
          changes.push('Карточка: обновлена');
        }

        // 5) Сохраняем документ (сработают pre/post save хуки)
        if (product.isModified()) await product.save({ session });

        // 6) Удаляем старую картинку, если реально сменили
        if (cardImage && old.cardImage) await this.uploadsService.deleteFile(old.cardImage.toString(), session);

        await this.logsService.addProductLog(
          product._id.toString(),
          `Продавец обновил продукт ${product._id}: ${changes.join('; ')}`,
          { forRoles: [UserType.SELLER], logLevel: LogLevel.LOW, session }
        );
        return product._id.toString();
      });

      // 7) Возвращаем продукт
      if (!updatedProductId) throw new NotFoundException('Не удалось обновить продукт');
      return this.getProduct(authedSeller, updatedProductId);

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
      console.error('Ошибка при обновлении продукта:', error);
      throw new InternalServerErrorException('Не удалось обновить продукт');
    } finally {
      session.endSession();
    }
  }

  //TODO: довести до ума, например лучше добавить метод скрытия продукта. А удалять только после удаление продукта из всех магазинов
  async deleteProduct(authedSeller: AuthenticatedUser, productId: string): Promise<MessageResponseDto> {
    checkId([productId]);

    const session = await this.productModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        const okSeller = await checkEntityStatus(
          this.sellerModel,
          { _id: new Types.ObjectId(authedSeller.id) },
          { session }
        );
        if (!okSeller) throw new NotFoundException('Продавец не найден');

        const foundProduct = await this.productModel.findOne({ _id: new Types.ObjectId(productId), owner: new Types.ObjectId(authedSeller.id) }).session(session).lean({ virtuals: true }).exec();
        if (!foundProduct) throw new NotFoundException('Продукт не найден');

        if (foundProduct.cardImage) await this.uploadsService.deleteFile(foundProduct.cardImage.toString(), session);
        await this.logsService.deleteAllProductLogs(foundProduct._id.toString(), session);
        await this.productModel.findByIdAndDelete(foundProduct._id).session(session).exec();

        await this.logsService.addSellerLog(
          authedSeller.id,
          `Продавец удалил продукт ${foundProduct.productName}`,
          { logLevel: LogLevel.MEDIUM, forRoles: [UserType.SELLER], session }
        );
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


  async getProductsOfShop(
    authedSeller: AuthenticatedUser,
    shopId: string,
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ProductOfShopResponseDto>> {
    checkId([shopId]);
    const { page = 1, pageSize = 10 } = paginationQuery;

    const paginateOptions = {
      page,
      limit: pageSize,
      lean: true,
      leanWithId: false, // Для поддержки виртуальных полей
      populate: {
        path: 'shopProducts',
        select: 'shopProductId pinnedTo stockQuantity status last7daysSales last7daysWriteOff',
        match: shopId && Types.ObjectId.isValid(shopId)
          ? { pinnedTo: new Types.ObjectId(shopId) }
          : { _id: { $exists: false } }
      },
      sort: { createdAt: -1 }, // Сортировка по дате создания (новые первыми)
    };

    const result = await this.productModel.paginate({ owner: new Types.ObjectId(authedSeller.id) }, paginateOptions);

    return transformPaginatedResult(result, ProductOfShopResponseDto);
  }
}