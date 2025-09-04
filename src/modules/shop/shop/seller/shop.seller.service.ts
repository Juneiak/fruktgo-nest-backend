import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { UploadsService } from 'src/common/modules/uploads/uploads.service';
import { EntityType, ImageType } from 'src/common/modules/uploads/uploaded-file.schema';
import { plainToInstance } from 'class-transformer';
import {
  UpdateShopDto,
  CreateShopDto,
} from './shop.seller.request.dto';
import { ShopFullResponseDto, ShopPreviewResponseDto } from './shop.seller.response.dto';
import { SellerModel } from 'src/modules/seller/seller.schema';
import { verifyUserStatus } from 'src/common/utils';
import {checkId} from 'src/common/utils';
import { LogsService } from 'src/common/modules/logs/logs.service';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { AuthenticatedUser } from 'src/common/types';
import { ShopModel } from '../shop.schema';

@Injectable()
export class ShopSellerService {
  constructor(
    @InjectModel('Seller') private sellerModel: SellerModel,
    @InjectModel('Shop') private shopModel: ShopModel,
    private readonly logsService: LogsService,
    private readonly uploadsService: UploadsService
  ) {}
    
  
  async getShops(authedSeller: AuthenticatedUser): Promise<ShopPreviewResponseDto[]> {
    const foundShops = await this.shopModel.find({ owner: new Types.ObjectId(authedSeller.id) }).lean({ virtuals: true }).exec();
    if (!foundShops) throw new NotFoundException('Продавец не найден');

    return plainToInstance(ShopPreviewResponseDto, foundShops, { excludeExtraneousValues: true });
  }



  async getFullShop(authedSeller: AuthenticatedUser, shopId: string): Promise<ShopFullResponseDto> {
    checkId([shopId]);
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).populate('currentShift').lean({ virtuals: true }).exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    if (!foundShop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');
    return plainToInstance(ShopFullResponseDto, foundShop, { excludeExtraneousValues: true });
  }


  async getPreviewShop(authedSeller: AuthenticatedUser, shopId: string): Promise<ShopPreviewResponseDto> {
    checkId([shopId]);
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).lean({ virtuals: true }).exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    if (!foundShop.owner.equals(new Types.ObjectId(authedSeller.id))) throw new ForbiddenException('Недостаточно прав');

    return plainToInstance(ShopPreviewResponseDto, foundShop, { excludeExtraneousValues: true });
  }


  async createShop(
    authedSeller: AuthenticatedUser,
    dto: CreateShopDto,
    shopImage?: Express.Multer.File
  ): Promise<ShopPreviewResponseDto> {
    // Получаем сессию из соединения с MongoDB для транзакций
    const session = await this.shopModel.db.startSession();

    try {
      // Начинаем транзакцию
      session.startTransaction();
      
      // Находим продавца в рамках транзакции
      const foundSeller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id))
        .select('_id verifiedStatus isBlocked')
        .session(session)
        .lean()
        .exec();
        
      if (!foundSeller) throw new NotFoundException('Продавец не найден');
      verifyUserStatus(foundSeller);

      // Формируем объект с адресными данными, если они есть
      const { city, street, house, latitude, longitude, ...restDto } = dto;
      
      // Проверяем, есть ли хотя бы одно адресное поле
      const hasAddressData = city || street || house || latitude || longitude;
      
      // Создаем магазин внутри транзакции
      const shop = await this.shopModel.create([{
        ...restDto,
        owner: foundSeller._id,
        // Если есть адресные данные, создаем объект address
        ...(hasAddressData ? {
          address: {
            city: city || null,
            street: street || null,
            house: house || null,
            latitude: latitude || null,
            longitude: longitude || null
          }
        } : {})
      }], { session }).then(docs => docs[0]);
      
      if (!shop) throw new NotFoundException('Не удалось создать магазин');

      // Если есть изображение, загружаем его в рамках транзакции
      if (shopImage) {
        const createdImage = await this.uploadsService.uploadImage({
          file: shopImage,
          accessLevel: 'public',
          entityType: EntityType.shop,
          entityId: shop._id.toString(),
          imageType: ImageType.shopImage,
          session // Передаем сессию в метод uploadImage
        });
        
        // Обновляем магазин в рамках транзакции
        await this.shopModel.findByIdAndUpdate(
          shop._id,
          { shopImage: createdImage._id }, // Используем поле shopImage из схемы Shop
          { session, new: true }
        ).exec();
      }
      // Фиксируем изменения
      await session.commitTransaction();

      const logDetails = [
        `Продавец ${foundSeller._id.toString()} создал магазин ${shop._id.toString()}`,
        `Название: "${shop.shopName}"`,
        dto.aboutShop ? `Описание: указано` : '',
        dto.city ? `Город: указан` : '',
        dto.street ? `Улица: указан` : '',
        dto.house ? `Дом: указан` : '',
        dto.latitude ? `Широта: указан` : '',
        dto.longitude ? `Долгота: указан` : '',
        dto.openAt || dto.closeAt ? `Часы работы: ${dto.openAt ? `открытие в ${dto.openAt}` : ''}${dto.closeAt ? `${dto.openAt ? ', ' : ''}закрытие в ${dto.closeAt}` : ''}` : '',
        dto.minOrderSum ? `Мин. сумма заказа: ${dto.minOrderSum}` : '',
        shopImage ? 'Изображение: загружено' : ''
      ].filter(item => item !== '').join('; ');
      await this.logsService.addShopLog(shop._id.toString(), LogLevel.LOW, logDetails);
      
      const sellerLogDetails = [
        `Создан новый магазин "${shop.shopName}" (ID: ${shop._id.toString()})`,
        `Название: "${shop.shopName}"`,
        dto.aboutShop ? `Описание: указано` : '',
        dto.city ? `Город: указан` : '',
        dto.street ? `Улица: указан` : '',
        dto.house ? `Дом: указан` : '',
        dto.latitude ? `Широта: указан` : '',
        dto.longitude ? `Долгота: указан` : '',
        dto.openAt || dto.closeAt ? `Часы работы: ${dto.openAt ? `открытие в ${dto.openAt}` : ''}${dto.closeAt ? `${dto.openAt ? ', ' : ''}закрытие в ${dto.closeAt}` : ''}` : '',
        dto.minOrderSum ? `Мин. сумма заказа: ${dto.minOrderSum}` : '',
        shopImage ? 'Изображение: загружено' : ''
      ].filter(item => item !== '').join('; ');
      await this.logsService.addSellerLog(foundSeller._id.toString(), LogLevel.LOW, sellerLogDetails);
      
      return this.getPreviewShop(authedSeller, shop._id.toString());

    } catch (error) {
      await session.abortTransaction();
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('Ошибка при создании магазина:', error);
      throw new InternalServerErrorException('Не удалось создать магазин');
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }

  

  async updateShop(
    authedSeller: AuthenticatedUser,
    shopId: string,
    dto: UpdateShopDto,
    shopImage?: Express.Multer.File
  ): Promise<ShopFullResponseDto> {
    // Получаем сессию из соединения с MongoDB для транзакций
    const session = await this.shopModel.db.startSession();
    
    try {
      // Начинаем транзакцию
      session.startTransaction();
      
      // Находим продавца в рамках транзакции
      const foundSeller = await this.sellerModel.findById(new Types.ObjectId(authedSeller.id))
        .select('_id verifiedStatus isBlocked')
        .session(session)
        .lean()
        .exec();
        
      if (!foundSeller) throw new NotFoundException('Продавец не найден');
      verifyUserStatus(foundSeller);
      
      // Проверяем и находим магазин в рамках транзакции
      checkId([shopId]);
      const foundShop = await this.shopModel.findOne({ 
        _id: new Types.ObjectId(shopId), 
        owner: foundSeller._id 
      }).session(session).lean().exec();
      
      if (!foundShop) throw new NotFoundException('Магазин не найден');
      if (!foundShop.owner.equals(foundSeller._id)) throw new ForbiddenException('Недостаточно прав');
      
      // Сохраняем старый ID изображения, если есть
      const oldImageId = foundShop.shopImage || null;
      
      // Обновляем базовые данные магазина (в UpdateShopDto нет полей для адреса)
      const updateFields: any = {...dto};
      
      // Обработка изображения, если оно есть
      if (shopImage) {
        // Загружаем изображение в рамках транзакции
        const createdImage = await this.uploadsService.uploadImage({
          file: shopImage,
          accessLevel: 'public',
          entityType: EntityType.shop,
          entityId: foundShop._id.toString(),
          imageType: ImageType.shopImage,
          session // Передаем сессию в метод uploadImage
        });
        
        // Добавляем ID нового изображения в параметры обновления
        updateFields.shopImage = createdImage._id;
      }
      
      // Обновляем магазин в рамках транзакции
      // Используем populate для currentShift, чтобы получить информацию о текущей смене, если она есть
      const updatedShop = await this.shopModel.findOneAndUpdate(
        { _id: new Types.ObjectId(shopId), owner: foundSeller._id },
        updateFields,
        { new: true, session }
      )
      .populate({
        path: 'currentShift',
        select: 'shiftId openedAt closedAt openedBy closedBy statistics'
      })
      .lean({ virtuals: true })
      .exec();
      
      if (!updatedShop) throw new NotFoundException('Магазин не найден');
      
      // Если загрузили новое изображение и есть старое - регистрируем старое для удаления
      if (updateFields.shopImage && oldImageId) {
        // Используем метод deleteFile с поддержкой сессий
        await this.uploadsService.deleteFile(oldImageId.toString(), session);
      }
      
      // Фиксируем изменения
      await session.commitTransaction();

      // Создаем детальное сообщение лога с обновленными данными
      const logDetails = [
        `Продавец ${foundSeller._id.toString()} обновил магазин ${updatedShop._id.toString()}`,
        dto.aboutShop ? 'Описание: обновлено' : '',
        dto.openAt || dto.closeAt ? `Часы работы: ${dto.openAt ? `открытие в ${dto.openAt}` : ''}${dto.closeAt ? `${dto.openAt ? ', ' : ''}закрытие в ${dto.closeAt}` : ''}` : '',
        dto.minOrderSum ? `Мин. сумма заказа: ${foundShop.minOrderSum} → ${updatedShop.minOrderSum}` : '',
        updateFields.shopImage ? 'Изображение: обновлено' : ''
      ].filter(item => item !== '').join('; ');
      
      // Добавляем лог об обновлении магазина
      await this.logsService.addShopLog(updatedShop._id.toString(), LogLevel.LOW, logDetails);

      const sellerLogDetails = [
        `Обновлен магазин "${updatedShop.shopName}" (ID: ${updatedShop._id.toString()})`,
        dto.aboutShop ? 'Описание: обновлено' : '',
        dto.openAt || dto.closeAt ? `Часы работы: ${dto.openAt ? `открытие в ${dto.openAt}` : ''}${dto.closeAt ? `${dto.openAt ? ', ' : ''}закрытие в ${dto.closeAt}` : ''}` : '',
        dto.minOrderSum ? `Мин. сумма заказа: ${foundShop.minOrderSum} → ${updatedShop.minOrderSum}` : '',
        updateFields.shopImage ? 'Изображение: обновлено' : ''
      ].filter(item => item !== '').join('; ');
      
      // Добавляем лог для продавца
      await this.logsService.addSellerLog(foundSeller._id.toString(), LogLevel.LOW, sellerLogDetails);
      
      // Получаем полные данные обновленного магазина
      return this.getFullShop(authedSeller, shopId);
    } catch (error) {
      // Отменяем транзакцию в случае ошибки
      await session.abortTransaction();
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof InternalServerErrorException ||
          error instanceof ForbiddenException) {
        throw error;
      }
      
      console.error('Ошибка при обновлении магазина:', error);
      throw new InternalServerErrorException('Не удалось обновить магазин');
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }
}