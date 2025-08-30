import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { plainToInstance } from "class-transformer";
import { ProductPreviewResponseDto, ProductFullResponseDto } from "./product.response.dtos";
import { checkId, transformPaginatedResult } from "src/common/utils";
import { ProductModel } from "../product.schema";
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from "src/common/dtos";
import { LogsService } from 'src/common/modules/logs/logs.service';
import { PaginatedLogDto } from 'src/common/modules/logs/logs.dtos';


@Injectable()
export class ProductAdminService {
  constructor(
    @InjectModel('Product') private productModel: ProductModel,
    private logsService: LogsService,
  ) {}

  async getSellerProducts(
    authedAdmin: AuthenticatedUser,
    sellerId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ProductPreviewResponseDto>> {
    checkId([sellerId]);
    const { page, pageSize } = paginationQuery;
    const products = await this.productModel.paginate({ owner: new Types.ObjectId(sellerId) }, { page, limit: pageSize });
    return transformPaginatedResult(products, ProductPreviewResponseDto)
  }



  async getSellerProduct(authedAdmin: AuthenticatedUser, productId: string): Promise<ProductFullResponseDto> {
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