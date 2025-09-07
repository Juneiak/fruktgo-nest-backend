
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import {
  ShopProductPreviewResponseDto,
  ShopProductFullResponseDto,
} from './shop-product.admin.response.dto';
import { checkId, transformPaginatedResult } from "src/common/utils";
import { AuthenticatedUser } from 'src/common/types';
import { PaginatedResponseDto, PaginationQueryDto } from 'src/common/dtos';
import { ShopProductModel } from '../shop-product.schema';
import { ShopProductQueryFilterDto } from './shop-product.admin.filter.dto';

@Injectable()
export class ShopProductAdminService {
  constructor(
    @InjectModel('ShopProduct') private shopProductModel: ShopProductModel,
  ) { }

  async getShopProduct(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    shopProductId: string
  ): Promise<ShopProductFullResponseDto> {
    checkId([shopProductId, shopId]);
    const foundShopProduct = await this.shopProductModel.findOne({ pinnedTo: new Types.ObjectId(shopId), _id: new Types.ObjectId(shopProductId) })
      .select('shopProductId pinnedTo product stockQuantity status images')
      .populate({
        path: 'images',
        select: '_id imageId createdAt',
        options: { sort: { createdAt: -1 } },
      })
      .populate({
        path: 'product',
        select: 'productId cardImage productArticle productName category price measuringScale stepRate aboutProduct origin',
      })
      .lean({ virtuals: true }).exec();
    if (!foundShopProduct) throw new NotFoundException('Товар не найден');

    return plainToInstance(ShopProductFullResponseDto, foundShopProduct, { excludeExtraneousValues: true });
  }


  async getShopProducts(
    authedAdmin: AuthenticatedUser,
    filterQuery: ShopProductQueryFilterDto,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductPreviewResponseDto>> {
    const { page = 1, pageSize = 10 } = paginationQuery;

    const filter: any = {};
    if (filterQuery.shopId) {
      checkId([filterQuery.shopId]);
      filter.pinnedTo = new Types.ObjectId(filterQuery.shopId);
    }

    const result = await this.shopProductModel.paginate(
      filter, 
      { page, limit: pageSize, lean: true, leanWithId: false,
      sort: { createdAt: -1 },
      populate: {
        path: 'product'
      },
    });
    return transformPaginatedResult(result, ShopProductPreviewResponseDto);
  }

}