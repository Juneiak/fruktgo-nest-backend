import { Injectable, NotFoundException, Inject, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ShopProductPreviewResponseDto,
  ShopProductFullResponseDto,
} from './admin.shop-products.response.dtos';
import { checkId } from "src/common/utils";
import { AuthenticatedUser } from 'src/common/types';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
import { ShopProductQueryDto } from './admin.shop-products.query.dtos';
import {
  ShopProductPort,
  SHOP_PRODUCT_PORT,
  ShopProductQueries
} from 'src/modules/shop-product';
import { LogsQueries, LogsEnums, LOGS_PORT, LogsPort } from 'src/infra/logs';
import { UserType } from 'src/common/enums/common.enum';
import {
  PaginatedResponseDto,
  LogResponseDto,
  transformPaginatedResult,
  PaginationQueryDto
} from 'src/interface/http/common';


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
    try {
      const query = new ShopProductQueries.GetShopProductQuery(shopProductId, {
        populateImages: true,
        populateProduct: true,
      });
      const shopProduct = await this.shopProductPort.getShopProduct(query);

      if (!shopProduct) throw new NotFoundException('Товар не найден');

      return plainToInstance(ShopProductFullResponseDto, shopProduct, { excludeExtraneousValues: true });
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Товар не найден'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID товара'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getShopProducts(
    authedAdmin: AuthenticatedUser,
    shopProductQuery: ShopProductQueryDto,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductPreviewResponseDto>> {
    try {
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
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные параметры фильтрации'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getShopProductLogs(
    authedAdmin: AuthenticatedUser,
    shopProductId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    try {
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
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID товара'),
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Товар не найден'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }
}