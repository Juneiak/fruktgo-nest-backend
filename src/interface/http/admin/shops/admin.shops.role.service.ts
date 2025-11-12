import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ShopPreviewResponseDto,
  ShopFullResponseDto,
} from './admin.shops.response.dtos';
import { UpdateShopDto, BlockShopDto } from './admin.shops.request.dtos';
import { checkId, transformPaginatedResult } from "src/common/utils";
import { AuthenticatedUser } from 'src/common/types';
import { UserType } from "src/common/enums/common.enum";
import { PaginatedResponseDto, LogResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { CommonListQueryOptions } from 'src/common/types/queries';
import {
  ShopPort,
  SHOP_PORT,
  ShopQueries,
  ShopCommands
} from 'src/modules/shop';
import { LogsQueries, LogsEnums, LOGS_PORT, LogsPort } from 'src/infra/logs';
import { ShopQueryFilterDto } from './admin.shops.query.dtos';

@Injectable()
export class AdminShopsRoleService {
  constructor(
    @Inject(SHOP_PORT) private readonly shopPort: ShopPort,
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
  ) { }



  async getShops(
    authedAdmin: AuthenticatedUser,
    shopQueryFilter: ShopQueryFilterDto,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopPreviewResponseDto>> {
    
    const query = new ShopQueries.GetShopsQuery({
      city: shopQueryFilter.city,
      sellerId: shopQueryFilter.sellerId,
      statuses: shopQueryFilter.statuses,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.shopPort.getShops(query, queryOptions);
    return transformPaginatedResult(result, ShopPreviewResponseDto);
  }


  async getShop(
    authedAdmin: AuthenticatedUser,
    shopId: string
  ): Promise<ShopFullResponseDto> {
    checkId([shopId]);

    const query = new ShopQueries.GetShopQuery({ shopId });
    const shop = await this.shopPort.getShop(query);
    
    if (!shop) throw new NotFoundException('Магазин не найден');

    return plainToInstance(ShopFullResponseDto, shop, { excludeExtraneousValues: true });
  }


  async getShopLogs(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    checkId([shopId]);

    const query = new LogsQueries.GetEntityLogsQuery(
      LogsEnums.LogEntityType.SHOP,
      shopId,
      [UserType.ADMIN]
    );
    
    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };
    
    const result = await this.logsPort.getEntityLogs(query, queryOptions);
    return transformPaginatedResult(result, LogResponseDto);
  }


  async updateShop(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    dto: UpdateShopDto
  ): Promise<ShopFullResponseDto> {
    checkId([shopId]);

    const command = new ShopCommands.UpdateShopCommand(shopId, {
      verifiedStatus: dto.verifiedStatus,
      internalNote: dto.internalNote,
    });

    await this.shopPort.updateShop(command);
    return this.getShop(authedAdmin, shopId);
  }


  async blockShop(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    dto: BlockShopDto
  ): Promise<ShopFullResponseDto> {
    checkId([shopId]);

    const command = new ShopCommands.BlockShopCommand(shopId, {
      status: dto.status,
      reason: dto.reason,
      code: dto.code,
      blockedUntil: dto.blockedUntil,
    });

    await this.shopPort.blockShop(command);
    return this.getShop(authedAdmin, shopId);
  }
}