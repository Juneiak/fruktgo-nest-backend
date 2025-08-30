
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SellerModel } from '../seller.schema';
import { plainToInstance } from 'class-transformer';
import {
  SellerForAdminFullResponseDto,
  SellerForAdminPreviewResponseDto,
  UpdateSellerByAdminDto
} from './seller.admin.dtos';
import { checkId } from 'src/common/utils';
import { LogLevel } from "src/common/modules/logs/logs.schemas";
import { LogsService } from 'src/common/modules/logs/logs.service';
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { transformPaginatedResult } from 'src/common/utils';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';

@Injectable()
export class SellerAdminService {
  constructor(
    @InjectModel('Seller') private sellerModel: SellerModel,
    private readonly logService: LogsService
  ) { }


  async getSellers(
    authedAdmin: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<SellerForAdminPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;

    const result = await this.sellerModel.paginate({}, {
      page,
      limit: pageSize,
      select: '+internalNote +phone +telegramId +telegramUsername +telegramFirstName +telegramLastName',
      lean: true,
      leanWithId: false,
      sort: { createdAt: -1 },
    });
    return transformPaginatedResult(result, SellerForAdminPreviewResponseDto);
  }


  async getSeller(authedAdmin: AuthenticatedUser, sellerId: string): Promise<SellerForAdminFullResponseDto> {
    checkId([sellerId]);

    const seller = await this.sellerModel.findById(new Types.ObjectId(sellerId)).select('+internalNote +phone +telegramId +telegramUsername +telegramFirstName +telegramLastName')
      .populate('employees', 'employeeId isBlocked verifiedStatus employeeAvatar employeeName phone telegramId telegramUsername sex status pinnedTo')
      .populate('shops', 'isBlocked verifiedStatus shopName shopImage address status openAt closeAt avgRating totalSales ratingsCount minOrderSum lastShiftDate shopOrdersCount shopProductsCount createdAt shopId')
      .lean({ virtuals: true }).exec();

    if (!seller) throw new NotFoundException('Продавец не найден');
    return plainToInstance(SellerForAdminFullResponseDto, seller, { excludeExtraneousValues: true, exposeDefaultValues: true });
  }


  async getSellerLogs(authedAdmin: AuthenticatedUser, sellerId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([sellerId]);
    return this.logService.getAllSellerLogs(sellerId, paginationQuery);
  }


  async updateSeller(authedAdmin: AuthenticatedUser, sellerId: string, dto: UpdateSellerByAdminDto): Promise<SellerForAdminFullResponseDto> {
    checkId([sellerId]);
    const session = await this.sellerModel.db.startSession();
    try {
      return  await session.withTransaction(async () => {
        const seller = await this.sellerModel.findById(sellerId).session(session);
        if (!seller) throw new NotFoundException(`Продавец с ID ${sellerId} не найден`);

        const changes: string[] = [];

        if (dto.isBlocked !== undefined && dto.isBlocked !== seller.isBlocked) {
          const oldValue = seller.isBlocked ? 'Да' : 'Нет';
          const newValue = dto.isBlocked ? 'Да' : 'Нет';
          seller.isBlocked = dto.isBlocked;
          changes.push(`Блокировка: ${oldValue} -> ${newValue}`);
        }

        if (dto.verifiedStatus !== undefined && dto.verifiedStatus !== seller.verifiedStatus) {
          const oldValue = seller.verifiedStatus;
          seller.verifiedStatus = dto.verifiedStatus;
          changes.push(`Статус верификации: "${oldValue}" -> "${dto.verifiedStatus}"`);
        }

        if (dto.internalNote !== undefined) seller.internalNote = dto.internalNote;

        if (seller.isModified()) await seller.save({ session });

        if (changes.length > 0 || dto.internalNote !== undefined) {
          let logText = `Администратор обновил данные продавца (${seller.companyName})`;
          if (changes.length > 0) logText += `:\n${changes.join('\n')}`;
          await this.logService.addSellerLog(seller._id.toString(), LogLevel.SERVICE, logText, session);
        }
        return this.getSeller(authedAdmin, sellerId);
      });

    } finally {
      session.endSession();
    }
  }
}