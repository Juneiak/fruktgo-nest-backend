import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { GetProductsQuery } from './product.queries';
import { ProductModel, Product } from './product.schema';
import { CreateProductCommand, UpdateProductCommand, DeleteProductCommand } from './product.commands';
import { checkId, assignField } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { SELLER_PORT, SellerPort } from '../seller/seller.port';
import { IMAGES_PORT, ImagesPort } from 'src/infra/images/images.port';
import { UploadImageCommand, UpdateImageCommand } from 'src/infra/images/images.commands';
import { ImageAccessLevel, ImageEntityType, ImageType, ImageSize } from 'src/infra/images/images.enums';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: ProductModel,
    @Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort,
  ) {}


  async getProducts(
    query: GetProductsQuery,
    options: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Product>> {
    const { filters } = query;

    const queryFilter: any = {};
    if (filters?.sellerId) queryFilter.owner = new Types.ObjectId(filters.sellerId);
    if (filters?.category) queryFilter.category = filters.category;

    const queryOptions: any = {
      page: options.pagination?.page || 1,
      limit: options.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: options.sort || { createdAt: -1 }
    };
    
    const result = await this.productModel.paginate(queryFilter, queryOptions);
    return result;
  }
  
  
  async getProduct(
    productId: string,
    options: CommonQueryOptions
  ): Promise<Product | null> {
    checkId([productId]);

    const dbQuery = this.productModel.findOne({ _id: new Types.ObjectId(productId) });
    if (options.session) dbQuery.session(options.session);

    const product = await dbQuery.lean({ virtuals: true }).exec();
    return product;
  }
  

  async createProduct(
    command: CreateProductCommand,
    options: CommonCommandOptions
  ): Promise<Product> {
    const { sellerId, payload } = command;
    checkId([sellerId]);

    const productId = new Types.ObjectId();
    const imageId = payload.cardImageFile ? new Types.ObjectId() : null;

    // Создаем продукт
    const productData: Omit<Product, 'productId' | 'shopProducts'> = {
      _id: productId,
      productName: payload.productName,
      category: payload.category,
      price: payload.price,
      measuringScale: payload.measuringScale,
      stepRate: payload.stepRate,
      aboutProduct: payload.aboutProduct || '',
      origin: payload.origin,
      productArticle: payload.productArticle,
      owner: new Types.ObjectId(sellerId),
      cardImage: imageId,
      totalStockQuantity: 0,
      statistics: {
        totalLast7daysSales: 0,
        totalSales: 0,
        totalLast7daysWriteOff: 0
      }
    };

    const createProductOptions: any = {};
    if (options?.session) createProductOptions.session = options.session;

    const product = await this.productModel.create([productData], createProductOptions).then(docs => docs[0]);
    
    // Загружаем изображение если предоставлено
    if (payload.cardImageFile && imageId) {
      const uploadImageCommand = new UploadImageCommand(
        payload.cardImageFile,
        {
          imageId: imageId.toString(),
          accessLevel: ImageAccessLevel.PUBLIC,
          entityType: ImageEntityType.PRODUCT,
          entityId: productId.toString(),
          imageType: ImageType.PRODUCT_CARD_IMAGE
        }
      );
      const uploadImageOptions: any = {};
      if (options?.session) uploadImageOptions.session = options.session;
      await this.imagesPort.uploadImage(uploadImageCommand, uploadImageOptions);
    }
    
    return product;
  }


  async updateProduct(
    command: UpdateProductCommand,
    options: CommonCommandOptions
  ): Promise<Product> {
    const { productId, payload } = command;
    checkId([productId]);

    const dbQuery = this.productModel.findOne({ _id: new Types.ObjectId(productId) });
    if (options.session) dbQuery.session(options.session);
    
    const product = await dbQuery.exec();
    if (!product) throw new DomainError({ code: 'NOT_FOUND', message: 'Продукт не найден' });
    
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
      if (oldImageId) {
        const deleteImageOptions: any = {};
        if (options.session) deleteImageOptions.session = options.session;
        await this.imagesPort.deleteImage(oldImageId.toString(), deleteImageOptions);
      }
      product.cardImage = null;

    } else if (payload.cardImageFile) {
      // Заменяем изображение если передан новый файл
      const oldImageId = product.cardImage;
      const newImageId = new Types.ObjectId();
      
      // Загружаем новое изображение
      const uploadImageCommand = new UploadImageCommand(
        payload.cardImageFile,
        {
          imageId: newImageId.toString(),
          accessLevel: ImageAccessLevel.PUBLIC,
          entityType: ImageEntityType.PRODUCT,
          entityId: productId,
          imageType: ImageType.PRODUCT_CARD_IMAGE
        }
      );
      
      const uploadImageOptions: any = {};
      if (options.session) uploadImageOptions.session = options.session;
      await this.imagesPort.uploadImage(uploadImageCommand, uploadImageOptions);
      
      // Обновляем ссылку на изображение
      product.cardImage = newImageId;
      
      // Удаляем старое изображение если было
      if (oldImageId) {
        const deleteImageOptions: any = {};
        if (options.session) deleteImageOptions.session = options.session;
        await this.imagesPort.deleteImage(oldImageId.toString(), deleteImageOptions);
      }
    }

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    
    await product.save(saveOptions);
    return product;
  }


  async deleteProduct(
    productId: string,
    options: CommonCommandOptions
  ): Promise<Product> {
    checkId([productId]);

    const dbQuery = this.productModel.findById(new Types.ObjectId(productId));
    if (options.session) dbQuery.session(options.session);
    
    const product = await dbQuery.exec();
    if (!product) throw new DomainError({ code: 'NOT_FOUND', message: 'Продукт не найден' });
    
    // TODO: Проверка что продукт не используется в магазинах
    
    // Удаляем изображение если есть
    if (product.cardImage) {
      const deleteImageOptions: any = {};
      if (options.session) deleteImageOptions.session = options.session;
      
      await this.imagesPort.deleteImage(product.cardImage.toString(), deleteImageOptions);
    }
    
    const deleteOptions: any = {};
    if (options.session) deleteOptions.session = options.session;

    await product.deleteOne(deleteOptions);
    return product;
  }

}