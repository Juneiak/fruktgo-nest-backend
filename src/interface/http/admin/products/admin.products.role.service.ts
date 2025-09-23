import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { plainToInstance } from "class-transformer";
import { ProductPreviewResponseDto, ProductFullResponseDto } from "./admin.products.response.dtos";
import { checkId, transformPaginatedResult } from "src/common/utils";
import { ProductModel } from "src/modules/product/product.schema";
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto } from "src/interface/http/common/common.response.dtos";
import { PaginationQueryDto } from "src/interface/http/common/common.query.dtos";
import { LogsService } from 'src/infra/logs/logs.service';
import { PaginatedLogDto } from 'src/infra/logs/logs.response.dto';
import { ProductQueryFilterDto } from './admin.products.query.dtos';


@Injectable()
export class AdminProductsRoleService {
  constructor(
    @InjectModel('Product') private productModel: ProductModel,
    private logsService: LogsService,
  ) {}

  async getProducts(
    authedAdmin: AuthenticatedUser,
    productQueryFilter: ProductQueryFilterDto,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ProductPreviewResponseDto>> {
    const { page, pageSize } = paginationQuery;
    const filter: any = {};
    if (productQueryFilter.sellerId) {
      checkId([productQueryFilter.sellerId]);
      filter.owner = new Types.ObjectId(productQueryFilter.sellerId);
    }
    
    const products = await this.productModel.paginate(filter, { page, limit: pageSize });
    return transformPaginatedResult(products, ProductPreviewResponseDto)
  }


  async getProduct(authedAdmin: AuthenticatedUser, productId: string): Promise<ProductFullResponseDto> {
    checkId([productId]);
    const foundProduct = await this.productModel.findOne({ _id: new Types.ObjectId(productId)})
    .populate({
      path: 'shopProducts',
      select: 'shopProductId pinnedTo stockQuantity status last7daysSales last7daysWriteOff', 
      populate: { path: 'pinnedTo', select: 'shopId shopImage shopName' }
    })
    .lean({ virtuals: true })
    .exec();
    if (!foundProduct) throw new NotFoundException('Продукт не найден');
    return plainToInstance(ProductFullResponseDto, foundProduct, { excludeExtraneousValues: true });
  }

  async getProductLogs(authedAdmin: AuthenticatedUser, productId: string, paginationQuery: PaginationQueryDto): Promise<PaginatedLogDto> {
    checkId([productId]);
    return await this.logsService.getAllProductLogs(productId, paginationQuery);
  }
}