// application/seller.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SellerModel, Seller } from './seller.schema';
import { Types, PaginateResult } from 'mongoose';
import { UpdateSellerCommand, BlockSellerCommand } from './seller.commands';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';
import { assignField, checkId } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { UserType } from 'src/common/enums/common.enum';
import { UploadsService } from 'src/infra/images/images.service';
import { ImageEntityType, ImageType } from 'src/infra/images/images.enums';

@Injectable()
export class SellerService {
  constructor(
    @InjectModel(Seller.name) private readonly sellerModel: SellerModel,
    private readonly uploadsService: UploadsService,
  ) {}


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


  async updateSeller(
    command: UpdateSellerCommand,
    options: CommonCommandOptions
  ): Promise<void> {
    const { sellerId, payload } = command;
    checkId([sellerId]);

    const dbQuery = this.sellerModel.findOne({ _id: new Types.ObjectId(sellerId) });
    if (options.session) dbQuery.session(options.session);
    
    const seller = await dbQuery.exec();
    if (!seller) throw new DomainError({ code: 'NOT_FOUND', message: 'Продавец не найден' });

    assignField(seller, 'internalNote', payload.internalNote);
    assignField(seller, 'verifiedStatus', payload.verifiedStatus, { onNull: 'skip' });
    assignField(seller, 'companyName', payload.companyName, { onNull: 'skip' });
    assignField(seller, 'inn', payload.inn, { onNull: 'skip' });
    assignField(seller, 'email', payload.email, { onNull: 'skip' });

    // Обработка логотипа
    if (payload.sellerLogo) {
      const uploaded = await this.uploadsService.uploadImage({
        file: payload.sellerLogo,
        accessLevel: 'public',
        entityType: ImageEntityType.SELLER,
        entityId: seller._id.toString(),
        imageType: ImageType.SELLER_LOGO,
        allowedUsers: [{ userId: seller._id.toString(), role: UserType.SELLER }],
        session: options.session,
      });
      
      const oldLogo = seller.sellerLogo;
      seller.sellerLogo = uploaded._id;
      
      // Удаляем старый логотип
      if (oldLogo && options.session) {
        await this.uploadsService.deleteFile(oldLogo.toString(), options.session);
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