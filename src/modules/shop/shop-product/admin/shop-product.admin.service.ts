
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import {
  ShopProductPreviewResponseDto,
  ShopProductFullResponseDto,
} from './shop-product.admin.response.dto';
import { checkId } from "src/common/utils";
import {AuthenticatedUser} from 'src/common/types';
import { PaginatedResponseDto, PaginationMetaDto, PaginationQueryDto } from 'src/common/dtos';
import { ShopProductModel } from '../shop-product.schema';

@Injectable()
export class ShopProductAdminService {
  constructor(
    @InjectModel('ShopProduct') private shopProductModel: ShopProductModel,
  ) {}

  async getShopProduct(
    authedAdmin: AuthenticatedUser,
    shopId: string,
    shopProductId: string
  ): Promise<ShopProductFullResponseDto> {
    checkId([shopProductId, shopId]);
    const foundShopProduct = await this.shopProductModel.findOne({pinnedTo: new Types.ObjectId(shopId), _id: new Types.ObjectId(shopProductId)})
    .select('shopProductId pinnedTo product stockQuantity status images')
    .populate({
      path: 'images',
      select: '_id imageId createdAt',
      options: { sort: { createdAt: -1 } },
    })
    .populate({
      path: 'logs',
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
    shopId: string,
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ShopProductPreviewResponseDto>> {
    checkId([shopId]);
    
    const { page = 1, pageSize = 10 } = paginationQuery;
    const skip = (page - 1) * pageSize;
    
    // Получаем общее количество товаров магазина для пагинации
    const totalItems = await this.shopProductModel.countDocuments({ pinnedTo: new Types.ObjectId(shopId) }).exec();
    
    // Получаем товары с пагинацией
    const shopProducts = await this.shopProductModel.find({ pinnedTo: new Types.ObjectId(shopId) })
      .populate('product')
      .sort({ createdAt: -1 }) // Сортировка по дате создания (от новых к старым)
      .skip(skip)
      .limit(pageSize)
      .lean({ virtuals: true })
      .exec();
    
    // Формируем метаданные пагинации
    const pagination = {
      totalItems,
      pageSize,
      currentPage: page,
      totalPages: Math.ceil(totalItems / pageSize)
    } as PaginationMetaDto;
    
    // Преобразуем модели в DTO
    const items = plainToInstance(ShopProductPreviewResponseDto, shopProducts, { excludeExtraneousValues: true });
    return { items, pagination };
  }

}