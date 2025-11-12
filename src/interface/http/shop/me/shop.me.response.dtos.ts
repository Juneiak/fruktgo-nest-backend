import { Expose, Type } from 'class-transformer';
import { Types } from 'mongoose';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import { ShopStatus } from 'src/modules/shop/shop.enums';
import { ShiftResponseDto } from 'src/interface/http/seller/shifts/seller.shifts.response.dtos';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

export class ShopPreviewResponseDto {
  @Expose() shopId: string;
  @ExposeObjectId() owner: Types.ObjectId;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @ExposeObjectId() shopImage?: Types.ObjectId | null;
  @Expose() aboutShop?: string | null;
  @ExposeObjectId() address?: Types.ObjectId | null;
  @Expose() status: ShopStatus;
  @Expose() openAt?: string | null;
  @Expose() closeAt?: string | null;
  @Expose() minOrderSum: number;
  @Expose() acceptanceTimeLimit: number;
  @Expose() assemblyTimeLimit: number;
  @Expose() minWeightPercentage: number;
  @Expose() @Type(() => ShiftResponseDto) currentShift?: ShiftResponseDto;
  @ExposeObjectId() pinnedEmployees: Types.ObjectId[];
}
