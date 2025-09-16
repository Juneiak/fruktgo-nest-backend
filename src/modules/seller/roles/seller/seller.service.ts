import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { SellerFullResponseDto, SellerPreviewResponseDto } from './seller.response.dtos';
import { SellerModel } from '../../seller.schema';
import { verifyUserStatus } from 'src/common/utils';
import { AuthenticatedUser } from 'src/common/types';
import { UserType } from "src/common/enums/common.enum";

import { ForbiddenException } from '@nestjs/common';
import { UpdateSellerDto } from './seller.request.dtos';
import { UploadsService } from 'src/common/modules/uploads/uploads.service';
import { EntityType, ImageType } from 'src/common/modules/uploads/uploaded-file.schema';
import { LogsService } from 'src/common/modules/logs/logs.service';

@Injectable()
export class SellerService {
  constructor(
    @InjectModel('Seller') private sellerModel: SellerModel,
    private readonly uploadsService: UploadsService,
    private readonly logsService: LogsService
  ) {}

  
  async getFullSeller(authedSeller: AuthenticatedUser): Promise<SellerFullResponseDto> {
    const seller = await this.sellerModel.findById(authedSeller.id).lean({ virtuals: true }).exec();
    if (!seller) throw new NotFoundException('Продавец не найден');

    return plainToInstance(SellerFullResponseDto, seller, { excludeExtraneousValues: true, exposeDefaultValues: true });
  }

  async getPreviewSeller(authedSeller: AuthenticatedUser): Promise<SellerPreviewResponseDto> {
    const seller = await this.sellerModel.findById(authedSeller.id).lean({ virtuals: true }).exec();
    if (!seller) throw new NotFoundException('Продавец не найден');

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
      const updatedSellerId = await session.withTransaction(async () => {
        const seller = await this.sellerModel.findById(authedSeller.id).session(session);
        if (!seller) throw new NotFoundException('Продавец не найден');
        verifyUserStatus(seller);
  
        const oldData = seller.toObject();
        const changes: string[] = [];
        if (updateSellerDto.companyName !== undefined) {
          seller.companyName = updateSellerDto.companyName;
          changes.push(`Название компании: "${oldData.companyName}" -> "${updateSellerDto.companyName}"`);
        }
        if (updateSellerDto.inn !== undefined) {
          seller.inn = updateSellerDto.inn;
          changes.push(`ИНН: "${oldData.inn}" -> "${updateSellerDto.inn}"`);
        }
        
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
          seller.sellerLogo = uploaded._id;
          changes.push(`Логотип обновлен`);
        }
  
        if (changes.length > 0 && seller.isModified()) {
          await seller.save({ session });
          if (oldData.sellerLogo && sellerLogo) await this.uploadsService.deleteFile(oldData.sellerLogo.toString(), session);
          
          await this.logsService.addSellerLog(
            seller._id.toString(),
            `Продавец обновил данные:\n${changes.join('\n')}`,
            { forRoles: [UserType.SELLER], session }
          );
        }
        return seller._id.toString();
      });

      if (!updatedSellerId) throw new NotFoundException('Не удалось обновить данные продавца');
      return this.getFullSeller(authedSeller);

  
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException('Ошибка при обновлении данных продавца: ' + (error as Error).message);
    } finally {
      session.endSession();
    }
  }
}