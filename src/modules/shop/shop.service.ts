import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, PaginateResult } from 'mongoose';
import { Shop, ShopModel } from './shop.schema';
import { ShopPort } from './shop.port';
import { checkId, assignField, selectFields } from 'src/common/utils';
import { DomainError } from 'src/common/errors';
import { CreateShopCommand, UpdateShopCommand, BlockShopCommand } from './shop.commands';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { GetShopsQuery, GetShopQuery } from './shop.queries';
import { AddressesPort, ADDRESSES_PORT, AddressesCommands, AddressesEnums } from 'src/infra/addresses';
import { IMAGES_PORT, ImagesPort } from 'src/infra/images/images.port';
import { UploadImageCommand } from 'src/infra/images/images.commands';
import { ImageAccessLevel, ImageEntityType, ImageType } from 'src/infra/images/images.enums';

@Injectable()
export class ShopService implements ShopPort {
  constructor(
    @InjectModel(Shop.name) private readonly shopModel: ShopModel,
    @Inject(ADDRESSES_PORT) private readonly addressesPort: AddressesPort,
    @Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort,
  ) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getShops(
    query: GetShopsQuery,
    queryOptions: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Shop>> {
    const { filters, options } = query;

    const dbQueryFilter: any = {};
    if (filters?.city) dbQueryFilter.city = filters.city;
    if (filters?.sellerId) dbQueryFilter.owner = new Types.ObjectId(filters.sellerId);
    if (filters?.statuses) dbQueryFilter.status = { $in: filters.statuses };
    
    const dbQueryOptions: any = {
      page: queryOptions.pagination?.page || 1,
      limit: queryOptions.pagination?.pageSize || 10,
      lean: true, 
      leanWithId: true,
      sort: queryOptions.sort || { createdAt: -1 }
    };

    if (options?.select && options.select.length > 0) {
      dbQueryOptions.select = selectFields<Shop>(...options.select);
    }

    const result = await this.shopModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  async getShop(
    query: GetShopQuery,
    queryOptions: CommonQueryOptions
  ): Promise<Shop | null> {
    const { filter, options } = query;

    const dbQueryFilter: any = {};
    if (filter?.shopId) dbQueryFilter._id = new Types.ObjectId(filter.shopId);
    else if (filter?.shopAccountId) dbQueryFilter.account = new Types.ObjectId(filter.shopAccountId);
    else throw DomainError.badRequest('Неверный запрос');

    const dbQuery = this.shopModel.findOne(dbQueryFilter);
    if (queryOptions.session) dbQuery.session(queryOptions.session);

    if (options?.select && options.select.length > 0) {
      dbQuery.select(selectFields<Shop>(...options.select));
    }

    const shop = await dbQuery.lean({ virtuals: true }).exec();
    return shop;
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createShop(
    command: CreateShopCommand,
    commandOptions: CommonCommandOptions
  ): Promise<Shop> {
    const { shopId, payload } = command;
    checkId([shopId, payload.shopAccountId, payload.ownerId]);

    // Проверяем уникальность имени магазина в городе (опционально, если нужно)
    const existingQuery = this.shopModel.exists({
      shopName: payload.shopName,
      city: payload.city,
      owner: new Types.ObjectId(payload.ownerId)
    });
    if (commandOptions?.session) existingQuery.session(commandOptions.session);
    
    const existing = await existingQuery.exec();
    if (existing) throw DomainError.conflict('Магазин с таким названием уже существует в этом городе');

    // Создаем только обязательные поля, остальные заполнятся через defaults в схеме
    const shopData: any = {
      _id: new Types.ObjectId(shopId),
      account: new Types.ObjectId(payload.shopAccountId),
      owner: new Types.ObjectId(payload.ownerId),
      city: payload.city,
      shopName: payload.shopName,
    };

    const createOptions: any = {};
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const shop = await this.shopModel.create([shopData], createOptions).then(docs => docs[0]);

    // Создаем адрес через AddressesPort, если предоставлен
    if (payload.address) {
      const addressCommand = new AddressesCommands.CreateAddressCommand(
        AddressesEnums.AddressEntityType.SHOP,
        shopId,
        {
          latitude: payload.address.latitude || 0,
          longitude: payload.address.longitude || 0,
          city: payload.address.city || payload.city,
          street: payload.address.street || '',
          house: payload.address.house || '',
        }
      );
      const createdAddress = await this.addressesPort.createAddress(addressCommand, commandOptions);
      
      // Обновляем магазин с ObjectId адреса
      shop.address = new Types.ObjectId(createdAddress.addressId);
      await shop.save(commandOptions?.session ? { session: commandOptions.session } : undefined);
    }

    return shop;
  }


  async updateShop(
    command: UpdateShopCommand,
    commandOptions: CommonCommandOptions
  ): Promise<void> {
    const { shopId, payload } = command;
    checkId([shopId]);

    const dbQuery = this.shopModel.findOne({ _id: new Types.ObjectId(shopId) });
    if (commandOptions.session) dbQuery.session(commandOptions.session);
    
    const shop = await dbQuery.exec();
    if (!shop) throw DomainError.notFound('Shop', shopId);

    assignField(shop, 'aboutShop', payload.aboutShop);
    assignField(shop, 'openAt', payload.openAt);
    assignField(shop, 'closeAt', payload.closeAt);
    assignField(shop, 'minOrderSum', payload.minOrderSum, { onNull: 'skip' });
    assignField(shop, 'verifiedStatus', payload.verifiedStatus, { onNull: 'skip' });
    assignField(shop, 'internalNote', payload.internalNote);
    assignField(shop, 'sellerNote', payload.sellerNote);

    // Обработка изображения магазина
    if (payload.shopImageFile === null) {
      // Удаляем изображение если передан null
      const oldImage = shop.shopImage;
      if (oldImage) {
        const deleteImageOptions: any = {};
        if (commandOptions.session) deleteImageOptions.session = commandOptions.session;
        await this.imagesPort.deleteImage(oldImage.toString(), deleteImageOptions);
      }
      shop.shopImage = null;

    } else if (payload.shopImageFile) {
      // Заменяем изображение если передан новый файл
      const oldImage = shop.shopImage;
      const newImageId = new Types.ObjectId();
      
      // Загружаем новое изображение
      const uploadImageCommand = new UploadImageCommand(
        newImageId.toString(),
        {
          imageFile: payload.shopImageFile,
          accessLevel: ImageAccessLevel.PUBLIC,
          entityType: ImageEntityType.SHOP,
          entityId: shopId,
          imageType: ImageType.SHOP_IMAGE
        }
      );
      
      const uploadImageOptions: any = {};
      if (commandOptions.session) uploadImageOptions.session = commandOptions.session;
      await this.imagesPort.uploadImage(uploadImageCommand, uploadImageOptions);
      
      // Обновляем ссылку на изображение
      shop.shopImage = newImageId;
      
      // Удаляем старое изображение если было
      if (oldImage) {
        const deleteImageOptions: any = {};
        if (commandOptions.session) deleteImageOptions.session = commandOptions.session;
        await this.imagesPort.deleteImage(oldImage.toString(), deleteImageOptions);
      }
    }

    const saveOptions: any = {};
    if (commandOptions.session) saveOptions.session = commandOptions.session;
    
    await shop.save(saveOptions);
  }


  async blockShop(
    command: BlockShopCommand,
    commandOptions: CommonCommandOptions
  ): Promise<void> {
    const { shopId, payload } = command;
    checkId([shopId]);

    const dbQuery = this.shopModel.findOne({ _id: new Types.ObjectId(shopId) });
    if (commandOptions.session) dbQuery.session(commandOptions.session);

    const shop = await dbQuery.exec();
    if (!shop) throw DomainError.notFound('Shop', shopId);

    assignField(shop.blocked, 'status', payload.status, { onNull: 'skip' });
    assignField(shop.blocked, 'reason', payload.reason);
    assignField(shop.blocked, 'code', payload.code);
    assignField(shop.blocked, 'blockedUntil', payload.blockedUntil);

    const saveOptions: any = {};
    if (commandOptions.session) saveOptions.session = commandOptions.session;
    
    await shop.save(saveOptions);
  }
}