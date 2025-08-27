
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shop } from '../schemas/shop.schema';
import { plainToInstance } from 'class-transformer';
import {
  ShopForPublicPreviewResponseDto, 
  ShopForPublicFullResponseDto,
  ShopProductForPublicResponseDto
} from './shops-for-public.dtos';
import {checkId} from 'src/common/utils';
import { verifyUserStatus } from 'src/common/utils';
import { VerifiedStatus } from 'src/common/types';
import { ShopProduct } from '../schemas/shop-product.schema';

@Injectable()
export class ShopForPublicService {
  constructor(
    @InjectModel('Shop') private shopModel: Model<Shop>,
    @InjectModel('ShopProduct') private shopProductModel: Model<ShopProduct>,
  ) {}


  async getPublicShops(): Promise<ShopForPublicPreviewResponseDto[]> {
    const shops = await this.shopModel.find({
      // isBlocked: false,
      // verifiedStatus: VerifiedStatus.VERIFIED
    }).lean({ virtuals: true }).exec();
    return plainToInstance(ShopForPublicPreviewResponseDto, shops, { excludeExtraneousValues: true });
  }


  async getPublicShop(shopId: string): Promise<ShopForPublicFullResponseDto> {
    checkId([shopId]);
    const shop = await this.shopModel.findById(new Types.ObjectId(shopId)).populate({
      path: 'shopProducts',
      populate: {
        path: 'product',
        model: 'Product'
      }
    }).lean({ virtuals: true }).exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
    verifyUserStatus(shop);

    return plainToInstance(ShopForPublicFullResponseDto, shop, { excludeExtraneousValues: true });
  }

  
  async getPublicShopProduct(shopId: string, shopProductId: string): Promise<ShopProductForPublicResponseDto> {
    checkId([shopId, shopProductId]);
    const foundShop = await this.shopModel.findById(new Types.ObjectId(shopId)).select('verifiedStatus isBlocked _id').lean().exec();
    if (!foundShop) throw new NotFoundException('Магазин не найден');
    verifyUserStatus(foundShop);

    const foundShopProduct = await this.shopProductModel.findById(new Types.ObjectId(shopProductId))
      .populate('product')
      .populate('images', 'imageId createdAt')
      .lean({ virtuals: true }).exec();
    if (!foundShopProduct) throw new NotFoundException('Товар не найден');

    return plainToInstance(ShopProductForPublicResponseDto, foundShopProduct, { excludeExtraneousValues: true});
  }

}