import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { ShopModel } from "src/modules/shop/shop/shop.schema";
import { AuthenticatedUser } from 'src/common/types';
import { ShopPreviewResponseDto } from './shop.response.dto';

@Injectable()
export class ShopService {
  constructor(
    @InjectModel('Shop') private shopModel: ShopModel,
  ) {}
  

  async getShopPreviewInfo(authedShop: AuthenticatedUser): Promise<ShopPreviewResponseDto> {
    const shop = await this.shopModel.findById(new Types.ObjectId(authedShop.id)).populate(['currentShift', 'pinnedEmployees']).exec();
    if (!shop) throw new NotFoundException('Магазин не найден');
  
    return plainToInstance(ShopPreviewResponseDto, shop, { excludeExtraneousValues: true });
  }
    
}