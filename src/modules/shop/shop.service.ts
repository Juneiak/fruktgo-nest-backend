import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ShopModel, Shop } from './shop.schema';
import { Types, PaginateResult } from 'mongoose';
import { CreateShopCommand, UpdateShopCommand, BlockShopCommand } from './shop.commands';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { assignField, checkId } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { IMAGES_PORT, ImagesPort } from 'src/infra/images/images.port';
import { UploadImageCommand } from 'src/infra/images/images.commands';
import { ImageAccessLevel, ImageEntityType, ImageType } from 'src/infra/images/images.enums';
import { GetShopsQuery } from './shop.queries';

@Injectable()
export class ShopService {
  constructor(
    @InjectModel(Shop.name) private readonly shopModel: ShopModel,
    @Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort,
  ) {}

  // ====================================================
  // QUERIES
  // ==================================================== 
    async getShops(
    query: GetShopsQuery,
    options: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Shop>> {
    const { filters } = query;

    const queryFilter: any = {};
    if (filters?.city) queryFilter.city = filters.city;
    if (filters?.sellerId) queryFilter.owner = new Types.ObjectId(filters.sellerId);

    const queryOptions: any = {
      page: options.pagination?.page || 1,
      limit: options.pagination?.pageSize || 10,
      lean: true, 
      leanWithId: true,
      sort: options.sort || { createdAt: -1 }
    };
    
    const result = await this.shopModel.paginate(queryFilter, queryOptions);
    return result;
  }
  
  
  async getShop(
    shopId: string,
    options: CommonQueryOptions
  ): Promise<Shop | null> {
    checkId([shopId]);

    const dbQuery = this.shopModel.findOne({ _id: new Types.ObjectId(shopId) });
    if (options.session) dbQuery.session(options.session);
    const shop = await dbQuery.lean({ virtuals: true }).exec();

    return shop;
  }


  // ====================================================
  // COMMANDS
  // ==================================================== 
  async createShop(
    command: CreateShopCommand,
    options: CommonCommandOptions
  ): Promise<Shop> {
    const { shopId, payload } = command;
    checkId([shopId, payload.shopAccountId, payload.ownerId]);

    // Проверяем уникальность имени магазина в городе (опционально, если нужно)
    const existingQuery = this.shopModel.exists({
      shopName: payload.shopName,
      city: payload.city,
      owner: new Types.ObjectId(payload.ownerId)
    });
    if (options?.session) existingQuery.session(options.session);
    
    const existing = await existingQuery.exec();
    if (existing) {
      throw new DomainError({ code: 'CONFLICT', message: 'Магазин с таким названием уже существует в этом городе' });
    }

    // Создаем только обязательные поля, остальные заполнятся через defaults в схеме
    const shopData = {
      _id: new Types.ObjectId(shopId),
      account: new Types.ObjectId(payload.shopAccountId),
      owner: new Types.ObjectId(payload.ownerId),
      city: payload.city,
      shopName: payload.shopName,
      address: payload.address,
    };

    const createOptions: any = {};
    if (options?.session) createOptions.session = options.session;

    const shop = await this.shopModel.create([shopData], createOptions).then(docs => docs[0]);
    return shop;
  }


  async updateShop(
    command: UpdateShopCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { shopId, payload } = command;
    checkId([shopId]);

    const dbQuery = this.shopModel.findOne({ _id: new Types.ObjectId(shopId) });
    if (options.session) dbQuery.session(options.session);
    
    const shop = await dbQuery.exec();
    if (!shop) {
      throw new DomainError({ code: 'NOT_FOUND', message: 'Магазин не найден' });
    }

    assignField(shop, 'aboutShop', payload.aboutShop);
    assignField(shop, 'openAt', payload.openAt);
    assignField(shop, 'closeAt', payload.closeAt);
    assignField(shop, 'minOrderSum', payload.minOrderSum, { onNull: 'skip' });
    assignField(shop, 'verifiedStatus', payload.verifiedStatus, { onNull: 'skip' });
    assignField(shop, 'internalNote', payload.internalNote);
    assignField(shop, 'sellerNote', payload.sellerNote);

    // Обработка изображения магазина
    if (payload.shopImage === null) {
      // Удаляем изображение если передан null
      const oldImage = shop.shopImage;
      if (oldImage) {
        const deleteImageOptions: any = {};
        if (options.session) deleteImageOptions.session = options.session;
        await this.imagesPort.deleteImage(oldImage.toString(), deleteImageOptions);
      }
      shop.shopImage = null;

    } else if (payload.shopImage) {
      // Заменяем изображение если передан новый файл
      const oldImage = shop.shopImage;
      const newImageId = new Types.ObjectId();
      
      // Загружаем новое изображение
      const uploadImageCommand = new UploadImageCommand(
        payload.shopImage,
        {
          imageId: newImageId.toString(),
          accessLevel: ImageAccessLevel.PUBLIC,
          entityType: ImageEntityType.SHOP,
          entityId: shopId,
          imageType: ImageType.SHOP_IMAGE
        }
      );
      
      const uploadImageOptions: any = {};
      if (options.session) uploadImageOptions.session = options.session;
      await this.imagesPort.uploadImage(uploadImageCommand, uploadImageOptions);
      
      // Обновляем ссылку на изображение
      shop.shopImage = newImageId;
      
      // Удаляем старое изображение если было
      if (oldImage) {
        const deleteImageOptions: any = {};
        if (options.session) deleteImageOptions.session = options.session;
        await this.imagesPort.deleteImage(oldImage.toString(), deleteImageOptions);
      }
    }

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    
    await shop.save(saveOptions);
  }

  
  async blockShop(
    command: BlockShopCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { shopId, payload } = command;
    checkId([shopId]);

    const dbQuery = this.shopModel.findOne({ _id: new Types.ObjectId(shopId) });
    if (options.session) dbQuery.session(options.session);

    const shop = await dbQuery.exec();
    if (!shop) throw new DomainError({ code: 'NOT_FOUND', message: 'Магазин не найден' });

    assignField(shop.blocked, 'status', payload.status, { onNull: 'skip' });
    assignField(shop.blocked, 'reason', payload.reason);
    assignField(shop.blocked, 'code', payload.code);
    assignField(shop.blocked, 'blockedUntil', payload.blockedUntil);

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    
    await shop.save(saveOptions);
  }
}