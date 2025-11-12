import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { Product, ProductModel } from './product.schema';
import { ProductPort } from './product.port';
import { checkId, assignField } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { CreateProductCommand, UpdateProductCommand } from './product.commands';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { GetProductsQuery } from './product.queries';
import { IMAGES_PORT, ImagesPort } from 'src/infra/images/images.port';
import { UploadImageCommand, UpdateImageCommand } from 'src/infra/images/images.commands';
import { ImageAccessLevel, ImageEntityType, ImageType, ImageSize } from 'src/infra/images/images.enums';

@Injectable()
export class ProductService implements ProductPort {
  constructor(
    @InjectModel(Product.name) private readonly productModel: ProductModel,
    @Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort,
  ) {}


  // ====================================================
  // QUERIES
  // ====================================================
  async getProducts(
    query: GetProductsQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Product>> {
    const { filters } = query;

    const dbQueryFilter: any = {};
    if (filters?.sellerId) dbQueryFilter.owner = new Types.ObjectId(filters.sellerId);
    if (filters?.category) dbQueryFilter.category = filters.category;

    const dbQueryOptions: any = {
      page: queryOptions?.pagination?.page || 1,
      limit: queryOptions?.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: queryOptions?.sort || { createdAt: -1 }
    };
    
    const result = await this.productModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }
  
  
  async getProduct(
    productId: string,
    queryOptions?: CommonQueryOptions
  ): Promise<Product | null> {
    checkId([productId]);

    const dbQuery = this.productModel.findOne({ _id: new Types.ObjectId(productId) });
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    const product = await dbQuery.lean({ virtuals: true }).exec();
    return product;
  }
  
  
  // ====================================================
  // COMMANDS
  // ====================================================
  async createProduct(
    command: CreateProductCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Product> {
    const { payload, productId } = command;
    checkId([payload.sellerId]);

    const finalProductId = productId ? new Types.ObjectId(productId) : new Types.ObjectId();
    const imageId = payload.cardImageFile ? new Types.ObjectId() : null;

    // Создаем продукт
    const productData: Omit<Product, 'productId' | 'shopProducts'> = {
      _id: finalProductId,
      productName: payload.productName,
      category: payload.category,
      price: payload.price,
      measuringScale: payload.measuringScale,
      stepRate: payload.stepRate,
      aboutProduct: payload.aboutProduct || '',
      origin: payload.origin,
      productArticle: payload.productArticle,
      owner: new Types.ObjectId(payload.sellerId),
      cardImage: imageId,
      totalStockQuantity: 0,
      statistics: {
        totalLast7daysSales: 0,
        totalSales: 0,
        totalLast7daysWriteOff: 0
      }
    };

    const createProductOptions: any = {};
    if (commandOptions?.session) createProductOptions.session = commandOptions.session;

    const product = await this.productModel.create([productData], createProductOptions).then(docs => docs[0]);
    
    // Загружаем изображение если предоставлено
    if (payload.cardImageFile && imageId) {
      await this.imagesPort.uploadImage(
        new UploadImageCommand(imageId.toString(), {
          imageFile: payload.cardImageFile,
          accessLevel: ImageAccessLevel.PUBLIC,
          entityType: ImageEntityType.PRODUCT,
          entityId: finalProductId.toString(),
          imageType: ImageType.PRODUCT_CARD_IMAGE
        }),
        commandOptions
      );
    }
    
    return product;
  }


  async updateProduct(
    command: UpdateProductCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Product> {
    const { productId, payload } = command;
    checkId([productId]);

    const dbQuery = this.productModel.findOne({ _id: new Types.ObjectId(productId) });
    if (commandOptions?.session) dbQuery.session(commandOptions.session);
    
    const product = await dbQuery.exec();
    if (!product) throw DomainError.notFound('Product', productId);
    
    assignField(product, 'productName', payload.productName, { onNull: 'skip' });
    assignField(product, 'category', payload.category, { onNull: 'skip' });
    assignField(product, 'price', payload.price, { onNull: 'skip' });
    assignField(product, 'measuringScale', payload.measuringScale, { onNull: 'skip' });
    assignField(product, 'stepRate', payload.stepRate, { onNull: 'skip' });
    assignField(product, 'aboutProduct', payload.aboutProduct);
    assignField(product, 'origin', payload.origin);
    assignField(product, 'productArticle', payload.productArticle);
    
    // Обработка cardImage
    if (payload.cardImageFile === null) {
      // Удаляем изображение если передан null
      const oldImageId = product.cardImage;
      if (oldImageId) await this.imagesPort.deleteImage(oldImageId.toString(), commandOptions);
      
      product.cardImage = null;

    } else if (payload.cardImageFile) {
      // Заменяем изображение если передан новый файл
      const oldImageId = product.cardImage;
      const newImageId = new Types.ObjectId();
      
      // Загружаем новое изображение
      await this.imagesPort.uploadImage(
        new UploadImageCommand(newImageId.toString(), {
          imageFile: payload.cardImageFile,
          accessLevel: ImageAccessLevel.PUBLIC,
          entityType: ImageEntityType.PRODUCT,
          entityId: productId,
          imageType: ImageType.PRODUCT_CARD_IMAGE
        }),
        commandOptions
      );
      
      // Обновляем ссылку на изображение
      product.cardImage = newImageId;
      
      // Удаляем старое изображение если было
      if (oldImageId) await this.imagesPort.deleteImage(oldImageId.toString(), commandOptions);
    }

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    
    await product.save(saveOptions);
    return product;
  }


  async deleteProduct(
    productId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<Product> {
    checkId([productId]);

    const dbQuery = this.productModel.findById(new Types.ObjectId(productId));
    if (commandOptions?.session) dbQuery.session(commandOptions.session);
    
    const product = await dbQuery.exec();
    if (!product) throw DomainError.notFound('Product', productId);
    
    // TODO: Проверка что продукт не используется в магазинах
    
    // Удаляем изображение если есть
    if (product.cardImage) await this.imagesPort.deleteImage(product.cardImage.toString(), commandOptions);
    
    const deleteOptions: any = {};
    if (commandOptions?.session) deleteOptions.session = commandOptions.session;

    await product.deleteOne(deleteOptions);
    return product;
  }

}