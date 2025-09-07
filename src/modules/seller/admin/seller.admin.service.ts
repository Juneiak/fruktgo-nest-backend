
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { SellerModel } from '../seller.schema';
import { plainToInstance } from 'class-transformer';
import {
  SellerFullResponseDto,
  SellerPreviewResponseDto,
} from './seller.admin.response.dto';
import { UpdateSellerByAdminDto } from './seller.admin.request.dto';
import { checkId } from 'src/common/utils';
import { LogsService } from 'src/common/modules/logs/logs.service';
import { AuthenticatedUser, UserType } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { transformPaginatedResult } from 'src/common/utils';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.response.dto';
import { BlockDto } from 'src/common/dtos/block.dto';
import { LogEntityType } from 'src/common/modules/logs/logs.schema';

@Injectable()
export class SellerAdminService {
  constructor(
    @InjectModel('Seller') private sellerModel: SellerModel,
    private readonly logsService: LogsService
  ) { }


  async getSellers(
    authedAdmin: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<SellerPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;

    const result = await this.sellerModel.paginate({}, {
      page,
      limit: pageSize,
      lean: true,
      leanWithId: false,
      sort: { createdAt: -1 },
    });
    return transformPaginatedResult(result, SellerPreviewResponseDto);
  }


  async getSeller(authedAdmin: AuthenticatedUser, sellerId: string): Promise<SellerFullResponseDto> {
    checkId([sellerId]);

    const seller = await this.sellerModel.findById(new Types.ObjectId(sellerId)).populate(['employees', 'shops']).lean({ virtuals: true }).exec();
    if (!seller) throw new NotFoundException('Продавец не найден');

    return plainToInstance(SellerFullResponseDto, seller, { excludeExtraneousValues: true, exposeDefaultValues: true });
  }


  async getSellerLogs(authedAdmin: AuthenticatedUser, sellerId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([sellerId]);
    return this.logsService.getEntityLogs(LogEntityType.SELLER, sellerId, paginationQuery);
  }


  async updateSeller(
    authedAdmin: AuthenticatedUser,
    sellerId: string,
    dto: UpdateSellerByAdminDto
  ): Promise<SellerFullResponseDto> {
    checkId([sellerId]);
    const seller = await this.sellerModel.findById(sellerId);
    if (!seller) throw new NotFoundException(`Продавец с ID ${sellerId} не найден`);

    const changes: string[] = [];

    if (dto.verifiedStatus !== undefined && dto.verifiedStatus !== seller.verifiedStatus) {
      const oldValue = seller.verifiedStatus;
      seller.verifiedStatus = dto.verifiedStatus;
      changes.push(`Статус верификации: "${oldValue}" -> "${dto.verifiedStatus}"`);
    }

    if (dto.internalNote !== undefined) {
      const oldValue = seller.internalNote;
      seller.internalNote = dto.internalNote;
      changes.push(`Заметка администратора: "${oldValue}" -> "${dto.internalNote}"`);
    }

    if (changes.length > 0 && seller.isModified()) {
      await seller.save();
      await this.logsService.addSellerLog(
        seller._id.toString(),
        `Администратор обновил данные продавца:\n${changes.join('\n')}`,
        { forRoles: [UserType.ADMIN] }
      );
    }
    return this.getSeller(authedAdmin, sellerId);

  }


  async blockSeller(authedAdmin: AuthenticatedUser, sellerId: string, dto: BlockDto): Promise<SellerFullResponseDto> {
    checkId([sellerId]);
    const seller = await this.sellerModel.findById(new Types.ObjectId(sellerId)).exec();
    if (!seller) throw new NotFoundException('Продавец не найден');

    const changedFields: string[] = [];

    if (dto.status !== undefined) {
      const oldValue = seller.blocked.status;
      seller.blocked.status = dto.status;
      changedFields.push(`статус блокировки: ${oldValue} -> ${dto.status}`);
    }
    if (dto.reason !== undefined) {
      const oldValue = seller.blocked.reason;
      seller.blocked.reason = dto.reason;
      changedFields.push(`причина блокировки: ${oldValue} -> ${dto.reason}`);
    }
    if (dto.code !== undefined) {
      const oldValue = seller.blocked.code;
      seller.blocked.code = dto.code;
      changedFields.push(`код блокировки: ${oldValue} -> ${dto.code}`);
    }
    if (dto.blockedUntil !== undefined) {
      const oldValue = seller.blocked.blockedUntil;
      seller.blocked.blockedUntil = dto.blockedUntil;
      changedFields.push(`срок блокировки: ${oldValue} -> ${dto.blockedUntil}`);
    }
    if (changedFields.length > 0 && seller.isModified()) {
      await seller.save();
      await this.logsService.addSellerLog(
        sellerId,
        `Админ ${authedAdmin.id} изменил статус блокировки сотрудника: ${changedFields.join(', ')}`,
        { forRoles: [UserType.SELLER] }
      );
    }
    return this.getSeller(authedAdmin, sellerId);
  }
}