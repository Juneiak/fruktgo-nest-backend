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
import { checkEntityStatus } from 'src/common/utils';
import { checkId } from 'src/common/utils';
import { LogsService } from 'src/common/modules/logs/logs.service';
import { LogLevel } from "src/common/modules/logs/logs.schema";
import { AuthenticatedUser, UserType } from 'src/common/types';
import { ShopModel } from '../shop.schema';

@Injectable()
export class ShopSellerService {
  constructor(
    @InjectModel('Seller') private sellerModel: SellerModel,
    @InjectModel('Shop') private shopModel: ShopModel,
    private readonly logsService: LogsService,
    private readonly uploadsService: UploadsService
  ) { }


  async getShops(authedSeller: AuthenticatedUser): Promise<ShopPreviewResponseDto[]> {
    const foundShops = await this.shopModel.find({ owner: new Types.ObjectId(authedSeller.id) }).lean({ virtuals: true }).exec();
    if (!foundShops) throw new NotFoundException('Продавец не найден');

    return plainToInstance(ShopPreviewResponseDto, foundShops, { excludeExtraneousValues: true });
  }


  async getFullShop(authedSeller: AuthenticatedUser, shopId: string): Promise<ShopFullResponseDto> {
    checkId([shopId]);
    const foundShop = await this.shopModel.findOne({ _id: new Types.ObjectId(shopId), owner: new Types.ObjectId(authedSeller.id) }).populate('currentShift').lean({ virtuals: true }).exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');

    return plainToInstance(ShopFullResponseDto, foundShop, { excludeExtraneousValues: true });
  }


  async createShop(
    authedSeller: AuthenticatedUser,
    dto: CreateShopDto,
    shopImage?: Express.Multer.File
  ): Promise<ShopPreviewResponseDto> {
    const session = await this.shopModel.db.startSession();

    try {
      session.startTransaction();
      const okSeller = await checkEntityStatus(
        this.sellerModel,
        { _id: new Types.ObjectId(authedSeller.id) },
        { session }
      );
      if (!okSeller) throw new NotFoundException('Продавец не найден или заблокирован или не верифицирован');

      const shop = await this.shopModel.create({
        owner: new Types.ObjectId(authedSeller.id),
        shopName:dto.shopName,
        aboutShop:dto.aboutShop,
        openAt:dto.openAt,
        closeAt:dto.closeAt,
        minOrderSum:dto.minOrderSum,
        address: {
          city: dto.city || null,
          street: dto.street || null,
          house: dto.house || null,
          latitude: dto.latitude || null,
          longitude: dto.longitude || null
        }
      }, { session }).then(docs => docs[0]);
      if (!shop) throw new NotFoundException('Не удалось создать магазин');

      if (shopImage) {
        const createdImage = await this.uploadsService.uploadImage({
          file: shopImage,
          accessLevel: 'public',
          entityType: EntityType.shop,
          entityId: shop._id.toString(),
          imageType: ImageType.shopImage,
          session
        });
        await this.shopModel.findByIdAndUpdate(shop._id, { shopImage: createdImage._id }, { session, new: true }).exec();
      }
      await session.commitTransaction();

      await this.logsService.addShopLog(
        shop._id.toString(),
        `Продавец ${authedSeller.id} создал магазин ${shop._id.toString()}`,
        { session, logLevel: LogLevel.LOW, forRoles: [UserType.SELLER] }
      );

      await this.logsService.addSellerLog(
        authedSeller.id,
        `Создан новый магазин "${shop.shopName}" (ID: ${shop._id.toString()})`,
        { session, logLevel: LogLevel.LOW, forRoles: [UserType.SELLER] }
      );

      return this.getFullShop(authedSeller, shop._id.toString());

    } catch (error) {
      await session.abortTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
      console.error('Ошибка при создании магазина:', error);
      throw new InternalServerErrorException('Не удалось создать магазин');
    } finally {
      session.endSession();
    }
  }


  async updateShop(
    authedSeller: AuthenticatedUser,
    shopId: string,
    dto: UpdateShopDto,
    shopImage?: Express.Multer.File
  ): Promise<ShopFullResponseDto> {
    const session = await this.shopModel.db.startSession();

    try {
      const updatedShopId = await session.withTransaction(async () => {
        // 1. Проверяем и находим продавца
        const okSeller = await checkEntityStatus(
          this.sellerModel,
          { _id: new Types.ObjectId(authedSeller.id) },
          { session }
        );
        if (!okSeller) throw new NotFoundException('Продавец не найден или заблокирован или не верифицирован');

        // 2. Проверяем ID и находим текущий магазин
        checkId([shopId]);
        const shop = await this.shopModel.findOne({
          _id: new Types.ObjectId(shopId),
          owner: new Types.ObjectId(authedSeller.id)
        }).session(session).exec();
        if (!shop) throw new NotFoundException('Магазин не найден');

        // 3. Собираем изменения для лога
        const oldData = shop.toObject();
        const changes: string[] = [];
        if (dto.aboutShop !== undefined && dto.aboutShop !== shop.aboutShop) {
          shop.aboutShop = dto.aboutShop;
          changes.push(`Описание: "${oldData.aboutShop}" → "${dto.aboutShop}"`);
        }
        if (dto.openAt !== undefined && dto.openAt !== shop.openAt) {
          shop.openAt = dto.openAt;
          changes.push(`Время открытия: "${oldData.openAt}" → "${dto.openAt}"`);
        }
        if (dto.closeAt !== undefined && dto.closeAt !== shop.closeAt) {
          shop.closeAt = dto.closeAt;
          changes.push(`Время закрытия: "${oldData.closeAt}" → "${dto.closeAt}"`);
        }
        if (dto.minOrderSum !== undefined && dto.minOrderSum !== shop.minOrderSum) {
          shop.minOrderSum = dto.minOrderSum;
          changes.push(`Мин. сумма заказа: ${oldData.minOrderSum} → ${dto.minOrderSum}`);
        }

        // 4. Обработка изображения
        if (shopImage) {
          const createdImage = await this.uploadsService.uploadImage({
            file: shopImage,
            accessLevel: 'public',
            entityType: EntityType.shop,
            entityId: shop._id.toString(),
            imageType: ImageType.shopImage,
            session
          });

          shop.shopImage = createdImage._id;
          changes.push('Изображение: обновлено');
        }

        // 6. Применяем изменения
        if (changes.length > 0 && shop.isModified()) {
          await shop.save({ session });
          if (oldData.shopImage && shopImage) await this.uploadsService.deleteFile(oldData.shopImage.toString(), session);

          await this.logsService.addShopLog(
            shop._id.toString(),
            `Продавец обновил магазин "${shop.shopName}": ${changes.join(', ')}`,
            { forRoles: [UserType.SELLER], session }
          );
        }

        return shop._id.toString();
      });

      if (!updatedShopId) throw new NotFoundException('Не удалось обновить магазин');
      return this.getFullShop(authedSeller, updatedShopId);

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      console.error('Ошибка при обновлении магазина:', error);
      throw new InternalServerErrorException('Не удалось обновить магазин');
    } finally {
      session.endSession();
    }
  }
}