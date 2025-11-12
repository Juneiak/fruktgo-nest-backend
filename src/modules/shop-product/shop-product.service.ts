import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { ShopProductModel, ShopProduct } from './shop-product.schema';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonQueryOptions, CommonListQueryOptions } from 'src/common/types/queries';
import { checkId, assignField } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { IMAGES_PORT, ImagesPort } from 'src/infra/images/images.port';
import { UploadImageCommand } from 'src/infra/images/images.commands';
import { ImageAccessLevel, ImageEntityType, ImageType } from 'src/infra/images/images.enums';
import {
  GetShopProductQuery,
  GetShopProductsQuery
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
    queryOptions?: CommonQueryOptions,
  ): Promise<ShopProduct | null> {
    const { shopProductId, options } = query;
    checkId([shopProductId]);

    const dbQuery = this.shopProductModel.findById(new Types.ObjectId(shopProductId));
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    // Обработка популяции из query.options
    if (options?.populateImages) {
      dbQuery.populate({
        path: 'images',
        options: { sort: { createdAt: -1 } }
      });
    }

    if (options?.populateProduct) {
      dbQuery.populate('product');
    }

    const shopProduct = await dbQuery.lean({ virtuals: true }).exec();
    return shopProduct;
  }


  async getShopProducts(
    query: GetShopProductsQuery,
    queryOptions: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<ShopProduct>> {
    const { filters, options } = query;

    const dbQueryFilter: any = {};
    if (filters?.shopId) dbQueryFilter.pinnedTo = new Types.ObjectId(filters.shopId);
    if (filters?.productId) dbQueryFilter.product = new Types.ObjectId(filters.productId);
    if (filters?.statuses) dbQueryFilter.status = { $in: filters.statuses };

    const dbQueryOptions: any = {
      page: queryOptions.pagination?.page || 1,
      limit: queryOptions.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: queryOptions.sort || { createdAt: -1 }
    };

    // Обработка популяции из query.options
    const dbPopulateArray: any[] = [];
    if (options?.populateImages) dbPopulateArray.push({ path: 'images', options: { sort: { createdAt: -1 } } });
    if (options?.populateProduct) dbPopulateArray.push({ path: 'product'});
    if (dbPopulateArray.length > 0) dbQueryOptions.populate = dbPopulateArray;
    
    const result = await this.shopProductModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }



  //TODO: он нужен вообще?
  // async getShopProductStock(
  //   shopProductsStockQuery: ShopProductsStockQuery,
  //   queryOptions: CommonQueryOptions,
  // ): Promise<ShopProduct[]> {
  //   checkId([shopProductsStockQuery.shopId]);
    
  //   const shopProductObjectIds = shopProductsStockQuery.shopProductIds.map(id => new Types.ObjectId(id));
  //   const foundShopProducts = await this.shopProductModel
  //     .find({
  //       pinnedTo: new Types.ObjectId(shopProductsStockQuery.shopId),
  //       _id: { $in: shopProductObjectIds }
  //     })
  //     .select('_id shopProductId stockQuantity')
  //     .lean({ virtuals: true })
  //     .exec();
    
  //   return foundShopProducts;
  // }



  // ====================================================
  // COMMANDS
  // ====================================================
  async createShopProduct(
    command: CreateShopProductCommand,
    commandOptions: CommonCommandOptions
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
    if (commandOptions.session) createOptions.session = commandOptions.session;

    const shopProduct = await this.shopProductModel.create([shopProductData], createOptions).then(docs => docs[0]);
    return shopProduct;
  }


  async updateShopProduct(
    command: UpdateShopProductCommand,
    commandOptions: CommonCommandOptions
  ): Promise<void> {
    const { shopProductId, payload } = command;
    checkId([shopProductId]);

    const dbQuery = this.shopProductModel.findById(new Types.ObjectId(shopProductId));
    if (commandOptions.session) dbQuery.session(commandOptions.session);

    const shopProduct = await dbQuery.exec();
    if (!shopProduct) throw DomainError.notFound('ShopProduct', shopProductId);

    // Обновляем stockQuantity
    if (payload.stockQuantity !== undefined) {
      shopProduct.stockQuantity = payload.stockQuantity;
      
      // Автоматически меняем статус если количество = 0
      if (payload.stockQuantity === 0) shopProduct.status = ShopProductStatus.OUT_OF_STOCK;
    }

    // Обновляем status (если не было автоматически установлено из-за stockQuantity = 0)
    if (payload.status !== undefined && shopProduct.stockQuantity !== 0) {
      assignField(shopProduct, 'status', payload.status);
    }

    const saveOptions: any = {};
    if (commandOptions.session) saveOptions.session = commandOptions.session;

    await shopProduct.save(saveOptions);
  }


  async archiveShopProduct(
    shopProductId: string,
    commandOptions: CommonCommandOptions
  ): Promise<void> {
    checkId([shopProductId]);

    const dbQuery = this.shopProductModel.findById(new Types.ObjectId(shopProductId));
    if (commandOptions.session) dbQuery.session(commandOptions.session);

    const shopProduct = await dbQuery.exec();
    if (!shopProduct) throw DomainError.notFound('ShopProduct', shopProductId);

    // Удаляем все изображения товара
    if (shopProduct.images && shopProduct.images.length > 0) {
      for (const imageId of shopProduct.images) {
        const deleteImageOptions: any = {};
        if (commandOptions.session) deleteImageOptions.session = commandOptions.session;
        await this.imagesPort.deleteImage(imageId.toString(), deleteImageOptions);
      }
      
      // Очищаем массив изображений
      shopProduct.images = [];
    }

    // Устанавливаем статус ARCHIVED
    shopProduct.status = ShopProductStatus.ARCHIVED;

    const saveOptions: any = {};
    if (commandOptions.session) saveOptions.session = commandOptions.session;
    
    await shopProduct.save(saveOptions);
  }


  async addShopProductImage(
    command: AddShopProductImageCommand,
    commandOptions: CommonCommandOptions
  ): Promise<string> {
    const { shopProductId, shopProductImageFile } = command;
    checkId([shopProductId]);

    const dbQuery = this.shopProductModel.findById(new Types.ObjectId(shopProductId));
    if (commandOptions.session) dbQuery.session(commandOptions.session);

    const shopProduct = await dbQuery.exec();
    if (!shopProduct) throw DomainError.notFound('ShopProduct', shopProductId);

    // Загружаем изображение
    const newImageId = new Types.ObjectId();
    const uploadImageOptions: any = {};
    if (commandOptions.session) uploadImageOptions.session = commandOptions.session;

    const uploadCommand = new UploadImageCommand(
      newImageId.toString(),
      {
        imageFile: shopProductImageFile,
        accessLevel: ImageAccessLevel.PUBLIC,
        entityType: ImageEntityType.SHOP_PRODUCT,
        imageType: ImageType.SHOP_PRODUCT_IMAGE,
      }
    );

    await this.imagesPort.uploadImage(uploadCommand, uploadImageOptions);

    // Добавляем изображение в массив
    shopProduct.images.push(newImageId);

    const saveOptions: any = {};
    if (commandOptions.session) saveOptions.session = commandOptions.session;
    await shopProduct.save(saveOptions);

    return newImageId.toString();
  }


  async removeShopProductImage(
    command: RemoveShopProductImageCommand,
    commandOptions: CommonCommandOptions
  ): Promise<void> {
    const { shopProductId, shopProductImageId } = command;
    checkId([shopProductId, shopProductImageId]);

    const dbQuery = this.shopProductModel.findById(new Types.ObjectId(shopProductId));
    if (commandOptions.session) dbQuery.session(commandOptions.session);

    const shopProduct = await dbQuery.exec();
    if (!shopProduct) throw DomainError.notFound('ShopProduct', shopProductId);

    const imageObjectId = new Types.ObjectId(shopProductImageId);
    const imageIndex = shopProduct.images.findIndex(img => img.equals(imageObjectId));
    
    if (imageIndex === -1) throw DomainError.notFound('ShopProductImage', shopProductImageId);

    // Удаляем изображение из хранилища
    const deleteImageOptions: any = {};
    if (commandOptions.session) deleteImageOptions.session = commandOptions.session;
    await this.imagesPort.deleteImage(shopProductImageId, deleteImageOptions);

    // Удаляем из массива
    shopProduct.images.splice(imageIndex, 1);

    const saveOptions: any = {};
    if (commandOptions.session) saveOptions.session = commandOptions.session;
    await shopProduct.save(saveOptions);
  }

}