
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import {ShopProductResponseDto} from './shop-product.public.response.dto';
import {checkId} from 'src/common/utils';
import { verifyUserStatus } from 'src/common/utils';
import { ShopProductModel } from '../../schemas/shop-product.schema';
import { ShopModel } from '../../schemas/shop.schema';

@Injectable()
export class ShopProductPublicService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
    @InjectModel('ShopProduct') private shopProductModel: ShopProductModel,
  ) {}

  
  async getPublicShopProduct(shopId: string, shopProductId: string): Promise<ShopProductResponseDto> {
    checkId([shopId, shopProductId]);
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).select('verifiedStatus isBlocked _id').lean().exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    verifyUserStatus(foundShop);

    const foundShopProduct = await this.shopProductModel.findById(new Types.ObjectId(shopProductId))
      .populate('product')
      .populate('images', 'imageId createdAt')
      .lean({ virtuals: true }).exec();
    if (!foundShopProduct) throw new NotFoundException('Товар не найден');

    return plainToInstance(ShopProductResponseDto, foundShopProduct, { excludeExtraneousValues: true});
  }

}