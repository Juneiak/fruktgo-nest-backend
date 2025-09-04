import { Expose, Type } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types';
import { ShopStatus } from "src/modules/shop/shop/shop.schema";
import { ShiftPreviewResponseDto } from 'src/modules/shop/shift/shop/shift.shop.response.dto';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

// todo: handle address
class ShopAddressDto {
  @Expose() address: string;
  @Expose() latitude: number;
  @Expose() longitude: number;
}

class PinnedEmployeepDto {
  @Expose() employeeId: string;
  @Expose() employeeName: string;
}

export class ShopPreviewResponseDto{
  @Expose() shopId: string;
  @ExposeObjectId() owner: any;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() shopName: string;
  @ExposeObjectId() shopImage?: string | null;
  @Expose() aboutShop?: string | null;
  @Expose() address?: ShopAddressDto;
  @Expose() status: ShopStatus;
  @Expose() openAt?: string | null;
  @Expose() closeAt?: string | null;
  @Expose() minOrderSum: number;
  @Expose() acceptanceTimeLimit: number;
  @Expose() assemblyTimeLimit: number;
  @Expose() minWeightPercentage: number;
  @Expose() @Type(() => ShiftPreviewResponseDto) currentShift: ShiftPreviewResponseDto;
  @Expose() @Type(() => PinnedEmployeepDto) pinnedEmployees: PinnedEmployeepDto[];
}
