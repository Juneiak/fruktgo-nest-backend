// application/seller.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SellerModel, Seller } from '../seller.schema';
import { UploadsService } from 'src/infra/uploads/uploads.service';
import { LogsService } from 'src/infra/logs/logs.service';
import { EntityType, ImageType } from 'src/infra/uploads/uploaded-file.schema';
import { Types, PaginateResult } from 'mongoose';
import { GetSellerQuery, FindSellersQuery } from './seller.queries';
import { UpdateSellerCommand } from './seller.commands';
import { UserType } from 'src/common/enums/common.enum';

@Injectable()
export class SellerService {
  constructor(
    @InjectModel(Seller.name) private readonly sellerModel: SellerModel,
    private readonly uploadsService: UploadsService,
    private readonly logsService: LogsService,
  ) {}

  async getSeller(query: GetSellerQuery): Promise<Seller | null> {
    return this.sellerModel
      .findById(new Types.ObjectId(query.sellerId))
      .lean({ virtuals: true })
      .exec();
  }

  async getSellers(query: FindSellersQuery): Promise<PaginateResult<Seller>> {
    const { page = 1, pageSize = 10 } = query;
    return this.sellerModel.paginate(
      {},
      {
        page,
        limit: pageSize,
        lean: true,
        leanWithId: false,
        sort: { createdAt: -1 },
      },
    );
  }

  async updateSeller(command: UpdateSellerCommand): Promise<Seller | null> {
    const session = await this.sellerModel.db.startSession();
    try {
      const updatedSellerId = await session.withTransaction(async () => {
        const seller = await this.sellerModel
          .findById(new Types.ObjectId(command.sellerId))
          .session(session);
        if (!seller) throw new NotFoundException('Продавец не найден');

        const oldData = seller.toObject();
        const changes: string[] = [];

        if (command.companyName !== undefined) {
          seller.companyName = command.companyName;
          changes.push(`Название компании: "${oldData.companyName}" -> "${command.companyName}"`);
        }
        if (command.inn !== undefined) {
          seller.inn = command.inn;
          changes.push(`ИНН: "${oldData.inn}" -> "${command.inn}"`);
        }

        if (command.sellerLogo) {
          const uploaded = await this.uploadsService.uploadImage({
            file: command.sellerLogo,
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

          if (oldData.sellerLogo && command.sellerLogo) {
            await this.uploadsService.deleteFile(oldData.sellerLogo.toString(), session);
          }

          await this.logsService.addSellerLog(
            seller._id.toString(),
            `Продавец обновил данные:\n${changes.join('\n')}`,
            { forRoles: [UserType.SELLER], session },
          );
        }

        return seller._id.toString();
      });

      if (!updatedSellerId) throw new NotFoundException('Не удалось обновить данные продавца');
      return this.getSeller(new GetSellerQuery(updatedSellerId));
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException('Ошибка при обновлении данных продавца: ' + (error as Error).message);
    } finally {
      session.endSession();
    }
  }
}