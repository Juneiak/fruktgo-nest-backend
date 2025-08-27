
import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { SellerForSellerFullResponseDto, SellerForSellerPreviewResponseDto } from './seller-for-seller.dtos';
import { Seller } from '../seller.schema';
import { verifyUserStatus } from 'src/common/utils';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser, UserType } from 'src/common/types';
import { ForbiddenException } from '@nestjs/common';
import { UpdateSellerForSellerDto } from './seller-for-seller.dtos';
import { UploadsService } from 'src/common/modules/uploads/uploads.service';
import { EntityType, ImageType } from 'src/common/modules/uploads/uploaded-file.schema';
import { Shop } from 'src/modules/shop/schemas/shop.schema';

@Injectable()
export class SellerForSellerService {
  constructor(
    @InjectModel('Seller') private sellerModel: Model<Seller>,

    private readonly uploadsService: UploadsService
  ) {}


  async getSellerByTelegramId(telegramId: number): Promise<Seller | null> {
    const seller = await this.sellerModel.findOne({ telegramId }).select('+telegramId _id').lean({ virtuals: true }).exec();
    if (!seller) return null;
    return seller;
  }

  async getSellerShopsByTelegramId(telegramId: number): Promise<Shop[] | null> {
    const sellerShops = await this.sellerModel.findOne({ telegramId }).select('+telegramId _id shops').populate('shops', '+_id owner shopName isBlocked verifiedStatus').exec();
    if (!sellerShops) return null;
    // @ts-ignore
    return sellerShops?.shops ?? null;
  }

  
  async getFullSeller(authedSeller: AuthenticatedUser): Promise<SellerForSellerFullResponseDto> {
    const seller = await this.sellerModel.findById(authedSeller.id).select('+phone +telegramId +telegramUsername +telegramFirstName +telegramLastName').lean({ virtuals: true }).exec();
    if (!seller) throw new NotFoundException('Продавец не найден');
    if (seller._id.toString() !== authedSeller.id) throw new ForbiddenException('Недостаточно прав');
    return plainToInstance(SellerForSellerFullResponseDto, seller, { excludeExtraneousValues: true, exposeDefaultValues: true });
  }

  async getPreviewSeller(authedSeller: AuthenticatedUser): Promise<SellerForSellerPreviewResponseDto> {
    const seller = await this.sellerModel.findById(authedSeller.id).select('+phone +telegramId').lean({ virtuals: true }).exec();
    if (!seller) throw new NotFoundException('Продавец не найден');
    if (seller._id.toString() !== authedSeller.id) throw new ForbiddenException('Недостаточно прав');
    return plainToInstance(SellerForSellerPreviewResponseDto, seller, { excludeExtraneousValues: true, exposeDefaultValues: true });
  }

  async updateSeller(
    authedSeller: AuthenticatedUser,
    dto: UpdateSellerForSellerDto,
    sellerLogo?: Express.Multer.File
  ): Promise<SellerForSellerFullResponseDto> {
    // Получаем сессию MongoDB для транзакций
    const session = await this.sellerModel.db.startSession();
    
    try {
      // Начинаем транзакцию
      session.startTransaction();
      
      // Находим продавца в рамках транзакции
      const seller = await this.sellerModel.findById(authedSeller.id).session(session).exec();
        
      if (!seller) throw new NotFoundException('Продавец не найден');
      if (seller._id.toString() !== authedSeller.id) throw new ForbiddenException('Недостаточно прав');
      verifyUserStatus(seller);

      // Сохраняем ID старого логотипа для возможного удаления
      const oldLogoId = seller.sellerLogo;
      let newLogoId: Types.ObjectId | null = null;

      // Если прикреплен новый логотип, загружаем его в рамках транзакции
      if (sellerLogo) {
        const uploadedFile = await this.uploadsService.uploadImage({
          file: sellerLogo,
          accessLevel: 'public',
          entityType: EntityType.seller,
          entityId: seller._id.toString(),
          imageType: ImageType.sellerLogo,
          allowedUsers: [{ userId: seller._id.toString(), role: UserType.SELLER }],
          session // Передаем сессию в метод uploadImage
        });
        newLogoId = uploadedFile._id;
      }

      // Обновляем поля продавца из dto
      Object.assign(seller, dto);
      
      // Устанавливаем новый логотип, если он был загружен
      if (newLogoId) seller.sellerLogo = newLogoId;

      // Сохраняем обновленного продавца в рамках транзакции
      await seller.save({ session });

      // Если был старый логотип и загружен новый, удаляем старый в рамках транзакции
      if (oldLogoId && newLogoId) await this.uploadsService.deleteFile(oldLogoId.toString(), session);

      // Фиксируем транзакцию
      await session.commitTransaction();
      
      return this.getFullSeller(authedSeller);
      
    } catch (error) {
      // Отменяем транзакцию при любой ошибке
      await session.abortTransaction();
      
      // Пробрасываем известные типы ошибок
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      
      console.error('Ошибка при обновлении данных продавца:', error);
      throw new InternalServerErrorException('Ошибка при обновлении данных продавца: ' + error.message);
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }
}