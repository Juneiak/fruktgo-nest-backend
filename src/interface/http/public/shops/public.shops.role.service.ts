import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ShopModel } from 'src/modules/shop/shop.schema';
import { plainToInstance } from 'class-transformer';
import {
  ShopPreviewResponseDto, 
  ShopFullResponseDto,
} from './public.shops.response.dtos';
import { checkId } from 'src/common/utils';
import { verifyUserStatus } from 'src/common/utils';


@Injectable()
export class PublicShopsRoleService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
  ) {}


  // async getPublicShops(): Promise<ShopPreviewResponseDto[]> {
  //   const shops = await this.shopModel.find({}).lean({ virtuals: true }).exec();
  //   return plainToInstance(ShopPreviewResponseDto, shops, { excludeExtraneousValues: true });
  // }


  // async getPublicShop(shopId: string): Promise<ShopFullResponseDto> {
  //   checkId([shopId]);
  //   const shop = await this.shopModel.findById(new Types.ObjectId(shopId)).populate({
  //     path: 'shopProducts',
  //     populate: {
  //       path: 'product',
  //       model: 'Product'
  //     }
  //   }).lean({ virtuals: true }).exec();
  //   if (!shop) throw new NotFoundException('Магазин не найден');
  //   verifyUserStatus(shop);

  //   return plainToInstance(ShopFullResponseDto, shop, { excludeExtraneousValues: true });
  // }
}