import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SellerModel, Seller } from './seller.schema';
import { Types, PaginateResult } from 'mongoose';
import { CreateSellerCommand, UpdateSellerCommand, BlockSellerCommand } from './seller.commands';
import { CommonCommandOptions } from 'src/common/types/commands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { assignField, checkId, parcePhoneNumber } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { IMAGES_PORT, ImagesPort } from 'src/infra/images/images.port';
import { UploadImageCommand } from 'src/infra/images/images.commands';
import { ImageAccessLevel, ImageEntityType, ImageType } from 'src/infra/images/images.enums';

@Injectable()
export class SellerService {
  constructor(
    @InjectModel(Seller.name) private readonly sellerModel: SellerModel,
    @Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort,
  ) { }
  

  async getSellers(
    options: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Seller>> {
    
    const queryOptions: any = {
      page: options.pagination?.page || 1,
      limit: options.pagination?.pageSize || 10,
      lean: true, leanWithId: true,
      sort: options.sort || { createdAt: -1 }
    };
    
    const result = await this.sellerModel.paginate({}, queryOptions);
    return result;
  }
  
  
  async getSeller(
    sellerId: string,
    options: CommonQueryOptions
  ): Promise<Seller | null> {

    const dbQuery = this.sellerModel.findOne({ _id: new Types.ObjectId(sellerId) });
    if (options.session) dbQuery.session(options.session);
    const seller = await dbQuery.lean({ virtuals: true }).exec()

    return seller;
  }


  async createSeller(
    command: CreateSellerCommand,
    options: CommonCommandOptions
  ): Promise<Seller> {
    const { sellerId, payload } = command;
    checkId([sellerId, payload.sellerAccountId]);

    // Парсим и валидируем номер телефона
    const parsedPhone = parcePhoneNumber(payload.phone);
    if (!parsedPhone || !parsedPhone.isValid()) {
      throw new DomainError({ code: 'VALIDATION', message: 'Неверный формат номера телефона' });
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
    if (options?.session) existingQuery.session(options.session);
    
    const existing = await existingQuery.exec();
    if (existing) {
      if (existing.telegramId === payload.telegramId) {
        throw new DomainError({ code: 'CONFLICT', message: 'Продавец с таким Telegram ID уже существует' });
      }
      if (existing.phone === phoneNumber) {
        throw new DomainError({ code: 'CONFLICT', message: 'Продавец с таким номером телефона уже существует' });
      }
      if (existing.email === payload.email) {
        throw new DomainError({ code: 'CONFLICT', message: 'Продавец с таким email уже существует' });
      }
    }

    // Создаем только обязательные поля, остальные заполнятся через defaults в схеме
    const sellerData = {
      _id: new Types.ObjectId(sellerId),
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
    if (options?.session) createOptions.session = options.session;

    const seller = await this.sellerModel.create([sellerData], createOptions).then(docs => docs[0]);
    return seller;
  }


  async updateSeller(
    command: UpdateSellerCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { sellerId, payload } = command;
    checkId([sellerId]);

    const dbQuery = this.sellerModel.findOne({ _id: new Types.ObjectId(sellerId) });
    if (options.session) dbQuery.session(options.session);
    
    const seller = await dbQuery.exec();
    if (!seller) {
      throw new DomainError({ code: 'NOT_FOUND', message: 'Продавец не найден' });
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
        throw new DomainError({ code: 'VALIDATION', message: 'Неверный формат номера телефона' });
      }
      const phoneNumber = parsedPhone.number as string;
      
      // Проверяем уникальность исключая текущий документ
      const existingQuery = this.sellerModel.exists({ 
        phone: phoneNumber,
        _id: { $ne: new Types.ObjectId(sellerId) }
      });
      if (options?.session) existingQuery.session(options.session);
      
      const existing = await existingQuery.exec();
      if (existing) {
        throw new DomainError({ code: 'CONFLICT', message: 'Продавец с таким номером телефона уже существует' });
      }
      
      assignField(seller, 'phone', phoneNumber, { onNull: 'skip' });
    }


    // Обработка логотипа
    if (payload.sellerLogo === null) {
      // Удаляем логотип если передан null
      const oldLogo = seller.sellerLogo;
      if (oldLogo) {
        const deleteImageOptions: any = {};
        if (options.session) deleteImageOptions.session = options.session;
        await this.imagesPort.deleteImage(oldLogo.toString(), deleteImageOptions);
      }
      seller.sellerLogo = null;

    } else if (payload.sellerLogo) {
      // Заменяем логотип если передан новый файл
      const oldLogo = seller.sellerLogo;
      const newLogoId = new Types.ObjectId();
      
      // Загружаем новый логотип
      const uploadImageCommand = new UploadImageCommand(
        payload.sellerLogo,
        {
          imageId: newLogoId.toString(),
          accessLevel: ImageAccessLevel.PUBLIC,
          entityType: ImageEntityType.SELLER,
          entityId: sellerId,
          imageType: ImageType.SELLER_LOGO
        }
      );
      
      const uploadImageOptions: any = {};
      if (options.session) uploadImageOptions.session = options.session;
      await this.imagesPort.uploadImage(uploadImageCommand, uploadImageOptions);
      
      // Обновляем ссылку на логотип
      seller.sellerLogo = newLogoId;
      
      // Удаляем старый логотип если был
      if (oldLogo) {
        const deleteImageOptions: any = {};
        if (options.session) deleteImageOptions.session = options.session;
        await this.imagesPort.deleteImage(oldLogo.toString(), deleteImageOptions);
      }
    }

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    
    await seller.save(saveOptions);
  }

  
  async blockSeller(
    command: BlockSellerCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { sellerId, payload } = command;
    checkId([sellerId]);

    const dbQuery = this.sellerModel.findOne({ _id: new Types.ObjectId(sellerId) });
    if (options.session) dbQuery.session(options.session);

    const seller = await dbQuery.exec();
    if (!seller) throw new DomainError({ code: 'NOT_FOUND', message: 'Продавец не найден' });

    assignField(seller.blocked, 'status', payload.status, { onNull: 'skip' });
    assignField(seller.blocked, 'reason', payload.reason);
    assignField(seller.blocked, 'code', payload.code);
    assignField(seller.blocked, 'blockedUntil', payload.blockedUntil);

    const saveOptions: any = {};
    if (options.session) saveOptions.session = options.session;
    
    await seller.save(saveOptions);
  }
}