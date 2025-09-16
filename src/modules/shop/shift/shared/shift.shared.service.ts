import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { Seller } from 'src/modules/seller/seller.schema';
import { Shift } from '../shift.schema';
import { ShiftTelegramBotPreviewResponseDto } from './shift.shared.response.dtos';

@Injectable()
export class ShiftSharedService {
  constructor(
    @InjectModel('Seller') private sellerModel: Model<Seller>,
    @InjectModel('Shift') private shiftModel: Model<Shift>,
  ) {}

  async getSellerActiveShiftsByTelegramId(telegramId: number): Promise<ShiftTelegramBotPreviewResponseDto[]> {
    const seller = await this.sellerModel
      .findOne({ telegramId })
      .select('_id shops')
      .populate({ path: 'shops', select: '_id' })
      .lean();
    if (!seller || !seller.shops || seller.shops.length === 0) return [];

    const shopIds = seller.shops.map((shop: any) => shop._id);
    const activeShifts = await this.shiftModel.find({
      shop: { $in: shopIds },
      closedAt: null
    }).populate('shop', '_id shopName').lean({ virtuals: true }).exec();

    return plainToInstance(ShiftTelegramBotPreviewResponseDto, activeShifts, { excludeExtraneousValues: true });
  }
}
