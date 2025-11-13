import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { ProductPreviewResponseDto, ProductFullResponseDto } from "./admin.products.response.dtos";
import { checkId } from "src/common/utils";
import { AuthenticatedUser } from 'src/common/types';
import { ProductQueryFilterDto } from './admin.products.query.dtos';
import {
  ProductPort,
  PRODUCT_PORT,
  ProductQueries
} from 'src/modules/product';
import { LogsQueries, LogsEnums } from 'src/infra/logs';
import { LOGS_PORT, LogsPort } from 'src/infra/logs';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { UserType } from 'src/common/enums/common.enum';
import {
  PaginatedResponseDto,
  LogResponseDto,
  transformPaginatedResult,
  PaginationQueryDto
} from 'src/interface/http/common';


@Injectable()
export class AdminProductsRoleService {
  constructor(
    @Inject(PRODUCT_PORT) private readonly productPort: ProductPort,
    @Inject(LOGS_PORT) private readonly logsPort: LogsPort,
  ) {}

  async getProducts(
    authedAdmin: AuthenticatedUser,
    productQueryFilter: ProductQueryFilterDto,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ProductPreviewResponseDto>> {

    const query = new ProductQueries.GetProductsQuery({
      sellerId: productQueryFilter.sellerId,
      category: productQueryFilter.category,
    });

    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };

    const result = await this.productPort.getProducts(query, queryOptions);
    return transformPaginatedResult(result, ProductPreviewResponseDto);

  }


  async getProduct(
    authedAdmin: AuthenticatedUser,
    productId: string
  ): Promise<ProductFullResponseDto> {

    const query = new ProductQueries.GetProductQuery(productId);
    const product = await this.productPort.getProduct(query);
    if (!product) throw new NotFoundException('Продукт не найден');

    return plainToInstance(ProductFullResponseDto, product, { excludeExtraneousValues: true });

  }


  async getProductLogs(
    authedAdmin: AuthenticatedUser,
    productId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<LogResponseDto>> {
    
    const query = new LogsQueries.GetEntityLogsQuery(
      LogsEnums.LogEntityType.PRODUCT,
      productId,
      [UserType.ADMIN]
    );
    
    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationQuery
    };
    
    const result = await this.logsPort.getEntityLogs(query, queryOptions);
    return transformPaginatedResult(result, LogResponseDto);

  }
}