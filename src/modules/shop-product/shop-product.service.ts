import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { ShopProductModel, ShopProduct } from './shop-product.schema';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonQueryOptions, CommonListQueryOptions } from 'src/common/types/queries';
import { checkId, assignField } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { IMAGES_PORT, ImagesPort } from 'src/infra/images/images.port';
import { UploadImageCommand } from 'src/infra/images/images.commands';
import { ImageAccessLevel, ImageEntityType, ImageType } from 'src/infra/images/images.enums';
import {
  GetShopProductQuery,
  GetShopProductsQuery,
  ShopProductsStockQuery
} from './shop-product.queries';
import { 
  CreateShopProductCommand,
  UpdateShopProductCommand, 
  AddShopProductImageCommand,
  RemoveShopProductImageCommand 
} from './shop-product.commands';
import { ShopProductStatus } from './shop-product.enums';


@Injectable()
export class ShopProductService {
  constructor(
    @InjectModel(ShopProduct.name) private readonly shopProductModel: ShopProductModel,
    @Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort,
  ) {}


  async getShopProduct(
    query: GetShopProductQuery,
    options?: CommonQueryOptions,
  ): Promise<ShopProduct | null> {
    const { shopProductId, options: queryOptions } = query;
    checkId([shopProductId]);

    const dbQuery = this.shopProductModel.findById(new Types.ObjectId(shopProductId));
    if (options?.session) dbQuery.session(options.session);

    // Обработка популяции из query.options
    if (queryOptions?.populateImages) {
      dbQuery.populate({
        path: 'images',
        options: { sort: { createdAt: -1 } }
      });
    }

    if (queryOptions?.populateProduct) {
      dbQuery.populate('product');
    }

    const shopProduct = await dbQuery.lean({ virtuals: true }).exec();
    return shopProduct;
  }


  async getShopProducts(
    query: GetShopProductsQuery,
    options: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<ShopProduct>> {
    const { filters, options: queryOptions } = query;

    const queryFilter: any = {};
    if (filters?.shopId) queryFilter.pinnedTo = new Types.ObjectId(filters.shopId);

    const paginateOptions: any = {
      page: options.pagination?.page || 1,
      limit: options.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: options.sort || { createdAt: -1 }
    };

    // Обработка популяции из query.options
    const populateArray: any[] = [];
    
    if (queryOptions?.populateImages) {
      populateArray.push({
        path: 'images',
        options: { sort: { createdAt: -1 } }
      });
    }

    if (queryOptions?.populateProduct) {
      populateArray.push({
        path: 'product'
      });
    }

    if (populateArray.length > 0) {
      paginateOptions.populate = populateArray;
    }
    
    const result = await this.shopProductModel.paginate(queryFilter, paginateOptions);
    return result;
  }



  //TODO: он нужен вообще?
  async getShopProductStock(
    shopProductsStockQuery: ShopProductsStockQuery,
    options: CommonQueryOptions,
  ): Promise<ShopProduct[]> {
    checkId([shopProductsStockQuery.shopId]);
    
    const shopProductObjectIds = shopProductsStockQuery.shopProductIds.map(id => new Types.ObjectId(id));
    const foundShopProducts = await this.shopProductModel
      .find({
        pinnedTo: new Types.ObjectId(shopProductsStockQuery.shopId),
        _id: { $in: shopProductObjectIds }
      })
      .select('_id shopProductId stockQuantity')
      .lean({ virtuals: true })
      .exec();
    
    return foundShopProducts;
  }



  // ====================================================
  // COMMANDS (Domain Methods)
  // ====================================================

  async createShopProduct(
    command: CreateShopProductCommand,
    options: CommonCommandOptions
  ): Promise<ShopProduct> {
    const { shopProductId, payload } = command;
    checkId([shopProductId, payload.productId, payload.shopId]);

    // Определяем количество и статус
    const stockQuantity = payload.stockQuantity ?? 0;
    let status: ShopProductStatus;

    // Логика определения статуса
    if (stockQuantity === 0) status = ShopProductStatus.OUT_OF_STOCK;
    else if (payload.status && [ShopProductStatus.ACTIVE, ShopProductStatus.PAUSED].includes(payload.status)) status = payload.status;
    else if (stockQuantity > 0) status = ShopProductStatus.ACTIVE;
    else status = ShopProductStatus.PAUSED;

    const shopProductData = {
      _id: new Types.ObjectId(shopProductId),
      product: new Types.ObjectId(payload.productId),
      pinnedTo: new Types.ObjectId(payload.shopId),
      stockQuantity,
      status,
    };

    const createOptions: any = {};
    if (options.session) createOptions.session = options.session;

    const shopProduct = await this.shopProductModel.create([shopProductData], createOptions).then(docs => docs[0]);
    return shopProduct;
  }


  async updateShopProduct(
    command: UpdateShopProductCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { shopProductId, payload } = command;
    checkId([shopProductId]);

    const dbQuery = this.shopProductModel.findById(new Types.ObjectId(shopProductId));
    if (options.session) dbQuery.session(options.session);

    const shopProduct = await dbQuery.exec();
    if (!shopProduct) {
      throw new DomainError({ code: 'NOT_FOUND', message: 'Товар магазина не найден' });
    }

    // Обновляем stockQuantity
    if (payload.stockQuantity !== undefined) {
      shopProduct.stockQuantity = payload.stockQuantity;
      
      // Автоматически меняем статус если количество = 0
      if (payload.stockQuantity === 0) {
        shopProduct.status = ShopProductStatus.OUT_OF_STOCK;
      }
    }

    // Обновляем status (если не было автоматически установлено из-за stockQuantity = 0)
    if (payload.status !== undefined && shopProduct.stockQuantity !== 0) {
      assignField(shopProduct, 'status', payload.status);
    }

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;

    await shopProduct.save(saveOptions);
  }


  async archiveShopProduct(
    shopProductId: string,
    options: CommonCommandOptions
  ): Promise<void> {
    checkId([shopProductId]);

    const dbQuery = this.shopProductModel.findById(new Types.ObjectId(shopProductId));
    if (options.session) dbQuery.session(options.session);

    const shopProduct = await dbQuery.exec();
    if (!shopProduct) {
      throw new DomainError({ code: 'NOT_FOUND', message: 'Товар магазина не найден' });
    }

    // Удаляем все изображения товара
    if (shopProduct.images && shopProduct.images.length > 0) {
      for (const imageId of shopProduct.images) {
        const deleteImageOptions: any = {};
        if (options.session) deleteImageOptions.session = options.session;
        await this.imagesPort.deleteImage(imageId.toString(), deleteImageOptions);
      }
      
      // Очищаем массив изображений
      shopProduct.images = [];
    }

    // Устанавливаем статус ARCHIVED
    shopProduct.status = ShopProductStatus.ARCHIVED;

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    
    await shopProduct.save(saveOptions);
  }


  async addShopProductImage(
    command: AddShopProductImageCommand,
    options: CommonCommandOptions
  ): Promise<string> {
    const { shopProductId, shopProductImageFile } = command;
    checkId([shopProductId]);

    const dbQuery = this.shopProductModel.findById(new Types.ObjectId(shopProductId));
    if (options.session) dbQuery.session(options.session);

    const shopProduct = await dbQuery.exec();
    if (!shopProduct) {
      throw new DomainError({ code: 'NOT_FOUND', message: 'Товар магазина не найден' });
    }

    // Загружаем изображение
    const newImageId = new Types.ObjectId();
    const uploadImageOptions: any = {};
    if (options.session) uploadImageOptions.session = options.session;

    const uploadCommand = new UploadImageCommand(
      shopProductImageFile,
      {
        imageId: newImageId.toString(),
        entityId: shopProductId,
        entityType: ImageEntityType.SHOP_PRODUCT,
        imageType: ImageType.SHOP_PRODUCT_IMAGE,
        accessLevel: ImageAccessLevel.PUBLIC,
      }
    );

    await this.imagesPort.uploadImage(uploadCommand, uploadImageOptions);

    // Добавляем изображение в массив
    shopProduct.images.push(newImageId);

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    await shopProduct.save(saveOptions);

    return newImageId.toString();
  }


  async removeShopProductImage(
    command: RemoveShopProductImageCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { shopProductId, imageId } = command;
    checkId([shopProductId, imageId]);

    const dbQuery = this.shopProductModel.findById(new Types.ObjectId(shopProductId));
    if (options.session) dbQuery.session(options.session);

    const shopProduct = await dbQuery.exec();
    if (!shopProduct) {
      throw new DomainError({ code: 'NOT_FOUND', message: 'Товар магазина не найден' });
    }

    const imageObjectId = new Types.ObjectId(imageId);
    const imageIndex = shopProduct.images.findIndex(img => img.equals(imageObjectId));
    
    if (imageIndex === -1) {
      throw new DomainError({ code: 'NOT_FOUND', message: 'Изображение не найдено у данного товара' });
    }

    // Удаляем изображение из хранилища
    const deleteImageOptions: any = {};
    if (options.session) deleteImageOptions.session = options.session;
    await this.imagesPort.deleteImage(imageId, deleteImageOptions);

    // Удаляем из массива
    shopProduct.images.splice(imageIndex, 1);

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    await shopProduct.save(saveOptions);
  }

}