import { Injectable } from '@nestjs/common';
import { Seller, SellerModel } from './seller.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shop } from 'src/modules/shop/schemas/shop.schema';


@Injectable()
export class SellerSharedService {

  constructor(
    @InjectModel('Seller') private sellerModel: SellerModel,
  ) {}


  async getSellerByTelegramId(telegramId: number): Promise<Seller | null> {
    const seller = await this.sellerModel.findOne({ telegramId }).select('+telegramId _id').lean({ virtuals: true }).exec();
    if (!seller) return null;
    return seller;
  }

  async getSellerShopsByTelegramId(telegramId: number): Promise<Shop[] | null> {
    const sellerShops = await this.sellerModel.findOne({ telegramId }).select('+telegramId _id shops').populate('shops', '+_id owner shopName isBlocked verifiedStatus').exec();
    if (!sellerShops) return null;
    // @ts-ignore
    return sellerShops?.shops ?? null;
  }
}