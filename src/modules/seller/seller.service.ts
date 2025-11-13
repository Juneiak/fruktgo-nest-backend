import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SellerModel, Seller } from './seller.schema';
import { Types, PaginateResult } from 'mongoose';
import { CreateSellerCommand, UpdateSellerCommand, BlockSellerCommand } from './seller.commands';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { assignField, checkId, parcePhoneNumber, selectFields } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { IMAGES_PORT, ImagesPort } from 'src/infra/images/images.port';
import { UploadImageCommand } from 'src/infra/images/images.commands';
import { ImageAccessLevel, ImageEntityType, ImageType } from 'src/infra/images/images.enums';
import { GetSellersQuery, GetSellerQuery } from './seller.queries';
import { SellerPort } from './seller.port';

@Injectable()
export class SellerService implements SellerPort {
  constructor(
    @InjectModel(Seller.name) private readonly sellerModel: SellerModel,
    @Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort,
  ) { }
  

  // ====================================================
  // QUERIES
  // ====================================================
  async getSellers(
    query: GetSellersQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Seller>> {
    
    const { filters, options } = query;
    
    let dbQueryFilter: any;
    if (filters?.verifiedStatuses && filters.verifiedStatuses.length > 0) dbQueryFilter.verifiedStatus = { $in: filters.verifiedStatuses };
    if (filters?.blockedStatuses && filters.blockedStatuses.length > 0) dbQueryFilter.blocked.status = { $in: filters.blockedStatuses };
    
    const dbQueryOptions: any = {
      page: queryOptions?.pagination?.page || 1,
      limit: queryOptions?.pagination?.pageSize || 10,
      lean: true, leanWithId: true,
      sort: queryOptions?.sort || { createdAt: -1 }
    };
    
    if (options?.select && options.select.length > 0) {
      dbQueryOptions.select = selectFields<Seller>(...options.select);
    }
    
    const result = await this.sellerModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }
  
  
  async getSeller(
    query: GetSellerQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Seller | null> {

    const { filter, options } = query;

    let dbQueryFilter: any;
    if (filter?.sellerId) dbQueryFilter = { _id: new Types.ObjectId(filter.sellerId) };
    else if (filter?.telegramId) dbQueryFilter = { telegramId: filter.telegramId };
    else if (filter?.phone) dbQueryFilter = { phone: filter.phone };
    else if (filter?.inn) dbQueryFilter = { inn: filter.inn };
    else throw DomainError.badRequest('Неверные параметры запроса');
    
    const dbQuery = this.sellerModel.findOne(dbQueryFilter);
    if (queryOptions?.session) dbQuery.session(queryOptions.session);
    
    if (options?.select && options.select.length > 0) {
      dbQuery.select(selectFields<Seller>(...options.select));
    }
    
    const seller = await dbQuery.lean({ virtuals: true }).exec();
    return seller;
  }


  
  // ====================================================
  // COMMANDS
  // ====================================================
  async createSeller(
    command: CreateSellerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Seller> {
    const { payload, sellerId } = command;
    checkId([payload.sellerAccountId, sellerId]);

    // Парсим и валидируем номер телефона
    const parsedPhone = parcePhoneNumber(payload.phone);
    if (!parsedPhone || !parsedPhone.isValid()) {
      throw DomainError.validation('Неверный формат номера телефона');
    }
    const phoneNumber = parsedPhone.number as string;

    // Проверяем уникальность одним запросом (эффективнее)
    const existingQuery = this.sellerModel.findOne({
      $or: [
        { telegramId: payload.telegramId },
        { phone: phoneNumber },
        { email: payload.email }
      ]
    }).select('telegramId phone email');
    if (commandOptions?.session) existingQuery.session(commandOptions.session);
    
    const existing = await existingQuery.exec();
    if (existing) {
      if (existing.telegramId === payload.telegramId) {
        throw DomainError.conflict('Продавец с таким Telegram ID уже существует');
      }
      if (existing.phone === phoneNumber) {
        throw DomainError.conflict('Продавец с таким номером телефона уже существует');
      }
      if (existing.email === payload.email) {
        throw DomainError.conflict('Продавец с таким email уже существует');
      }
    }

    // Создаем только обязательные поля, остальные заполнятся через defaults в схеме
    const sellerData = {
      _id: sellerId ? new Types.ObjectId(sellerId) : new Types.ObjectId(),
      account: new Types.ObjectId(payload.sellerAccountId),
      telegramId: payload.telegramId,
      phone: phoneNumber,
      companyName: payload.companyName,
      inn: payload.inn,
      email: payload.email,
      telegramUsername: payload.telegramUsername,
      telegramFirstName: payload.telegramFirstName,
      telegramLastName: payload.telegramLastName,
    };

    const createOptions: any = {};
    if (commandOptions?.session) createOptions.session = commandOptions.session;

    const seller = await this.sellerModel.create([sellerData], createOptions).then(docs => docs[0]);
    return seller;
  }


  async updateSeller(
    command: UpdateSellerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { sellerId, payload } = command;
    checkId([sellerId]);

    const dbQuery = this.sellerModel.findOne({ _id: new Types.ObjectId(sellerId) });
    if (commandOptions?.session) dbQuery.session(commandOptions.session);
    
    const seller = await dbQuery.exec();
    if (!seller) {
      throw DomainError.notFound('seller', 'Продавец не найден');
    }

    assignField(seller, 'internalNote', payload.internalNote);
    assignField(seller, 'verifiedStatus', payload.verifiedStatus, { onNull: 'skip' });
    assignField(seller, 'companyName', payload.companyName, { onNull: 'skip' });
    assignField(seller, 'inn', payload.inn, { onNull: 'skip' });
    assignField(seller, 'email', payload.email, { onNull: 'skip' });

    // Обработка номера телефона
    if (payload.phone) {
      const parsedPhone = parcePhoneNumber(payload.phone);
      if (!parsedPhone || !parsedPhone.isValid()) {
        throw DomainError.validation('Неверный формат номера телефона');
      }
      const phoneNumber = parsedPhone.number as string;
      
      // Проверяем уникальность исключая текущий документ
      const existingQuery = this.sellerModel.exists({ 
        phone: phoneNumber,
        _id: { $ne: new Types.ObjectId(sellerId) }
      });
      if (commandOptions?.session) existingQuery.session(commandOptions.session);
      
      const existing = await existingQuery.exec();
      if (existing) throw DomainError.conflict('Продавец с таким номером телефона уже существует');
      
      assignField(seller, 'phone', phoneNumber, { onNull: 'skip' });
    }


    // Обработка логотипа
    if (payload.sellerLogo === null) {
      // Удаляем логотип если передан null
      const oldLogo = seller.sellerLogo;
      if (oldLogo) await this.imagesPort.deleteImage(oldLogo.toString(), commandOptions);
      seller.sellerLogo = null;

    } else if (payload.sellerLogo) {
      // Заменяем логотип если передан новый файл
      const oldLogo = seller.sellerLogo;
      const newLogoId = new Types.ObjectId();
      
      // Загружаем новый логотип
      await this.imagesPort.uploadImage(
        new UploadImageCommand(newLogoId.toString(), {
          imageFile: payload.sellerLogo,
          accessLevel: ImageAccessLevel.PUBLIC,
          entityType: ImageEntityType.SELLER,
          entityId: sellerId,
          imageType: ImageType.SELLER_LOGO
        }),
        commandOptions
      );
      
      // Обновляем ссылку на логотип
      seller.sellerLogo = newLogoId;
      
      // Удаляем старый логотип если был
      if (oldLogo) await this.imagesPort.deleteImage(oldLogo.toString(), commandOptions);
    }

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    
    await seller.save(saveOptions);
  }

  
  async blockSeller(
    command: BlockSellerCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { sellerId, payload } = command;
    checkId([sellerId]);

    const dbQuery = this.sellerModel.findOne({ _id: new Types.ObjectId(sellerId) });
    if (commandOptions?.session) dbQuery.session(commandOptions.session);

    const seller = await dbQuery.exec();
    if (!seller) throw DomainError.notFound('seller', 'Продавец не найден');

    assignField(seller.blocked, 'status', payload.status, { onNull: 'skip' });
    assignField(seller.blocked, 'reason', payload.reason);
    assignField(seller.blocked, 'code', payload.code);
    assignField(seller.blocked, 'blockedUntil', payload.blockedUntil);

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    
    await seller.save(saveOptions);
  }
}