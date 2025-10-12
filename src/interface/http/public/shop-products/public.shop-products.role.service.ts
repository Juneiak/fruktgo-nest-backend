import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { ShopProductResponseDto } from './public.shop-products.response.dtos';
import { checkEntityStatus, checkId, transformPaginatedResult } from 'src/common/utils';
import { ShopProductModel } from 'src/modules/shop-product/shop-product.schema';
import { ShopModel } from 'src/modules/shop/shop.schema';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { ShopProductQueryDto } from './public.shop-products.query.dtos';

@Injectable()
export class PublicShopProductsRoleService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
    @InjectModel('ShopProduct') private shopProductModel: ShopProductModel,
  ) {}

  // async getPublicShopProducts(
  //   shopProductQuery: ShopProductQueryDto,
  //   paginationQuery: PaginationQueryDto
  // ): Promise<PaginatedResponseDto<ShopProductResponseDto>> {
  //   const { shopId } = shopProductQuery;
  //   if (!shopId) throw new BadRequestException('Магазин не указан');

  //   const okShop = await checkEntityStatus(
  //     this.shopModel,
  //     { _id: new Types.ObjectId(shopId) }
  //   )
  //   if (!okShop) throw new NotFoundException('Магазин не найден или недоступен или заблокирован или не верифицирован');

  //   const { page = 1, pageSize = 10 } = paginationQuery;
  //   const foundShopProducts = await this.shopProductModel.paginate(
  //     { pinnedTo: new Types.ObjectId(shopId) }, 
  //     { page, limit: pageSize, lean: true, leanWithId: false}
  //   )
  //   return transformPaginatedResult(foundShopProducts, ShopProductResponseDto);
  // }

  
  // async getPublicShopProduct(shopProductId: string): Promise<ShopProductResponseDto> {
  //   checkId([shopProductId]);
  //   const foundShopProduct = await this.shopProductModel.findById(new Types.ObjectId(shopProductId))
  //     .populate('product')
  //     .populate('images', 'imageId createdAt')
  //     .lean({ virtuals: true }).exec();
  //   if (!foundShopProduct) throw new NotFoundException('Товар не найден');

  //   const okShop = await checkEntityStatus(
  //     this.shopModel,
  //     { _id: foundShopProduct.pinnedTo }
  //   )
  //   if (!okShop) throw new NotFoundException('Магазин не найден или недоступен или заблокирован или не верифицирован');

  //   return plainToInstance(ShopProductResponseDto, foundShopProduct, { excludeExtraneousValues: true});
  // }

}