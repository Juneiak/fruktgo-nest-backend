import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import {
  ShopPreviewResponseDto,
  ShopFullResponseDto,
} from './shop.admin.response.dtos';
import { UpdateShopDto } from './shop.admin.request.dtos';
import { checkId, transformPaginatedResult } from "src/common/utils";
import { LogsService } from 'src/common/modules/logs/logs.service';
import { AuthenticatedUser } from 'src/common/types';
import { UserType } from "src/common/enums/common.enum";

import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.response.dto';
import { ShopModel } from '../../shop.schema';
import { Types } from 'mongoose';
import { BlockDto } from 'src/common/dtos/block.dto';

@Injectable()
export class ShopAdminService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
    private readonly logsService: LogsService
  ) { }


  async getShops(
    authedAdmin: AuthenticatedUser,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;

    const result = await this.shopModel.paginate(
      {}, 
      { page, limit: pageSize, lean: true, leanWithId: false,
        sort: { createdAt: -1 },
        populate: {
          path: 'owner',
          select: 'sellerId companyName'
        },
    });
    return transformPaginatedResult(result, ShopPreviewResponseDto);
  }


  async getShop(authedAdmin: AuthenticatedUser, shopId: string): Promise<ShopFullResponseDto> {
    checkId([shopId]);
    const shop = await this.shopModel.findById(shopId).populate("pinnedEmployees").populate("owner", 'sellerId companyName').lean({ virtuals: true }).exec();
    if (!shop) throw new NotFoundException(`Магазин с ID ${shopId} не найден`);

    return plainToInstance(ShopFullResponseDto, shop, { excludeExtraneousValues: true, exposeDefaultValues: true });
  }


  async getShopLogs(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedLogDto> {
    return this.logsService.getAllShopLogs(shopId, paginationQuery);
  }


  async updateShop(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    dto: UpdateShopDto,
  ): Promise<ShopFullResponseDto> {
    checkId([shopId]);

    // Ищем магазин по ID
    const shop = await this.shopModel.findById(shopId);
    if (!shop) throw new NotFoundException(`Магазин с ID ${shopId} не найден`);

    // Собираем изменения для лога
    const changes: string[] = [];

    if (dto.verifiedStatus !== undefined && dto.verifiedStatus !== shop.verifiedStatus) {
      const oldValue = shop.verifiedStatus;
      shop.verifiedStatus = dto.verifiedStatus;
      changes.push(`Статус верификации: "${oldValue}" -> "${dto.verifiedStatus}"`);
    }
    if (dto.internalNote !== undefined) {
      const oldValue = shop.internalNote;
      shop.internalNote = dto.internalNote;
      changes.push(`Заметка администратора: "${oldValue}" -> "${dto.internalNote}"`);
    }

    if (changes.length > 0 && shop.isModified()) {
      await shop.save();
      await this.logsService.addShopLog(
        shop._id.toString(),
        `Администратор обновил данные магазина (${shop.shopName}):\n${changes.join('\n')}`,
        { forRoles: [UserType.ADMIN] }
      );
    }
    return this.getShop(authedAdmin, shopId);
  }


  async blockSeller(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    dto: BlockDto,
  ): Promise<ShopFullResponseDto> {
    checkId([shopId]);
    const shop = await this.shopModel.findById(new Types.ObjectId(shopId)).exec();
    if (!shop) throw new NotFoundException('Магазин не найден');

    const changedFields: string[] = [];

    if (dto.status !== undefined) {
      const oldValue = shop.blocked.status;
      shop.blocked.status = dto.status;
      changedFields.push(`статус блокировки: ${oldValue} -> ${dto.status}`);
    }
    if (dto.reason !== undefined) {
      const oldValue = shop.blocked.reason;
      shop.blocked.reason = dto.reason;
      changedFields.push(`причина блокировки: ${oldValue} -> ${dto.reason}`);
    }
    if (dto.code !== undefined) {
      const oldValue = shop.blocked.code;
      shop.blocked.code = dto.code;
      changedFields.push(`код блокировки: ${oldValue} -> ${dto.code}`);
    }
    if (dto.blockedUntil !== undefined) {
      const oldValue = shop.blocked.blockedUntil;
      shop.blocked.blockedUntil = dto.blockedUntil;
      changedFields.push(`срок блокировки: ${oldValue} -> ${dto.blockedUntil}`);
    }
    if (changedFields.length > 0 && shop.isModified()) {
      await shop.save();
      await this.logsService.addShopLog(
        shopId,
        `Админ ${authedAdmin.id} изменил статус блокировки сотрудника: ${changedFields.join(', ')}`,
        { forRoles: [UserType.SHOP] }
      );
    }
    return this.getShop(authedAdmin, shopId);
  }

}