
import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { SellerFullResponseDto, SellerPreviewResponseDto } from './seller.response.dtos';
import { SellerModel } from '../seller.schema';
import { verifyUserStatus } from 'src/common/utils';
import { checkId } from 'src/common/utils';
import { AuthenticatedUser, UserType } from 'src/common/types';
import { ForbiddenException } from '@nestjs/common';
import { UpdateSellerDto } from './seller.request.dtos';
import { UploadsService } from 'src/common/modules/uploads/uploads.service';
import { EntityType, ImageType } from 'src/common/modules/uploads/uploaded-file.schema';
import { Shop } from 'src/modules/shop/shop/shop.schema';

@Injectable()
export class SellerService {
  constructor(
    @InjectModel('Seller') private sellerModel: SellerModel,
    private readonly uploadsService: UploadsService
  ) {}

  
  async getFullSeller(authedSeller: AuthenticatedUser): Promise<SellerFullResponseDto> {
    const seller = await this.sellerModel.findById(authedSeller.id).select('+phone +telegramId +telegramUsername +telegramFirstName +telegramLastName').lean({ virtuals: true }).exec();
    if (!seller) throw new NotFoundException('Продавец не найден');
    if (seller._id.toString() !== authedSeller.id) throw new ForbiddenException('Недостаточно прав');
    return plainToInstance(SellerFullResponseDto, seller, { excludeExtraneousValues: true, exposeDefaultValues: true });
  }

  async getPreviewSeller(authedSeller: AuthenticatedUser): Promise<SellerPreviewResponseDto> {
    const seller = await this.sellerModel.findById(authedSeller.id).select('+phone +telegramId').lean({ virtuals: true }).exec();
    if (!seller) throw new NotFoundException('Продавец не найден');
    if (seller._id.toString() !== authedSeller.id) throw new ForbiddenException('Недостаточно прав');
    return plainToInstance(SellerPreviewResponseDto, seller, { excludeExtraneousValues: true, exposeDefaultValues: true });
  }

  async updateSeller(
    authedSeller: AuthenticatedUser,
    updateSellerDto: UpdateSellerDto,
    sellerLogo?: Express.Multer.File
  ): Promise<SellerFullResponseDto> {
    const session = await this.sellerModel.db.startSession();
    let newLogoIdForCompensation: string | null = null;
  
    try {
      await session.withTransaction(async () => {
        const seller = await this.sellerModel.findById(authedSeller.id).session(session);
        if (!seller) throw new NotFoundException('Продавец не найден');
        verifyUserStatus(seller);
  
        const oldLogoId = seller.sellerLogo ?? null;
  
        // загрузка нового файла (внутри той же session)
        if (sellerLogo) {
          const uploaded = await this.uploadsService.uploadImage({
            file: sellerLogo,
            accessLevel: 'public',
            entityType: EntityType.seller,
            entityId: seller._id.toString(),
            imageType: ImageType.sellerLogo,
            allowedUsers: [{ userId: seller._id.toString(), role: UserType.SELLER }],
            session,
          });
          newLogoIdForCompensation = uploaded._id.toString();
          seller.sellerLogo = uploaded._id;
        }
  
        // вайтлист обновляемых полей
        const { companyName, inn } = updateSellerDto;
        if (companyName !== undefined) seller.companyName = companyName;
        if (inn !== undefined) seller.inn = inn;
  
        if (seller.isModified()) await seller.save({ session });
  
        // удаляем старый логотип только если реально изменили
        if (oldLogoId && sellerLogo) await this.uploadsService.deleteFile(oldLogoId.toString(), session);
        
      });

      return this.getFullSeller(authedSeller);
  
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException('Ошибка при обновлении данных продавца: ' + (error as Error).message);
    } finally {
      session.endSession();
    }
  }
}