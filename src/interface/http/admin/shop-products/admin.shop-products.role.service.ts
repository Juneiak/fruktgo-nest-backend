import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ShopProductPreviewResponseDto,
  ShopProductFullResponseDto,
} from './admin.shop-products.response.dtos';
import { checkId, transformPaginatedResult } from "src/common/utils";
import { AuthenticatedUser } from 'src/common/types';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { LogResponseDto, PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { ShopProductQueryDto } from './admin.shop-products.query.dtos';
import {
  ShopProductPort,
  SHOP_PRODUCT_PORT,
  ShopProductQueries
} from 'src/modules/shop-product';
import { LogsQueries, LogsEnums, LOGS_PORT, LogsPort } from 'src/infra/logs';
import { UserType } from 'src/common/enums/common.enum';

@Injectable()
export class AdminShopProductsRoleService {
  constructor(
    @Inject(SHOP_PRODUCT_PORT) private readonly shopProductPort: ShopProductPort,
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
  ) {}

  async getShopProduct(
    authedAdmin: AuthenticatedUser,
    shopProductId: string
  ): Promise<ShopProductFullResponseDto> {
    checkId([shopProductId]);

    const query = new ShopProductQueries.GetShopProductQuery(shopProductId, {
      populateImages: true,
      populateProduct: true,
    });

    const shopProduct = await this.shopProductPort.getShopProduct(query);
    if (!shopProduct) throw new NotFoundException('Товар не найден');

    return plainToInstance(ShopProductFullResponseDto, shopProduct, { excludeExtraneousValues: true });
  }


  async getShopProducts(
    authedAdmin: AuthenticatedUser,
    shopProductQuery: ShopProductQueryDto,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductPreviewResponseDto>> {
    const query = new ShopProductQueries.GetShopProductsQuery({
      shopId: shopProductQuery.shopId,
      productId: shopProductQuery.productId,
      statuses: shopProductQuery.statuses,
    }, {
      populateProduct: true,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.shopProductPort.getShopProducts(query, queryOptions);
    return transformPaginatedResult(result, ShopProductPreviewResponseDto);
  }


  async getShopProductLogs(
    authedAdmin: AuthenticatedUser,
    shopProductId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    checkId([shopProductId]);

    const query = new LogsQueries.GetEntityLogsQuery(
      LogsEnums.LogEntityType.SHOP_PRODUCT,
      shopProductId,
      [UserType.ADMIN]
    );
    
    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };
    
    const result = await this.logsPort.getEntityLogs(query, queryOptions);
    return transformPaginatedResult(result, LogResponseDto);
  }
}