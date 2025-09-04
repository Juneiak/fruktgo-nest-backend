import { Expose } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types';
import { Types } from 'mongoose';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';
import { Blocked } from 'src/common/schemas/common-schemas';

export class SellerAuthResponseDto {
  @Expose() sellerId: string;
  @Expose() blocked: Blocked;
  @Expose() telegramId: number;
  @Expose() verifiedStatus: VerifiedStatus;
}

export class LoginCodeForSellerResponseDto {
  @Expose() code: string;
  @Expose() expiresAt: Date;
  @Expose() tgBotUrl: string;
}



export class ShopAuthResponseDto {
  @Expose() shopId: string;
  @Expose() blocked: Blocked;
  @Expose() verifiedStatus: VerifiedStatus;
  @ExposeObjectId() owner: Types.ObjectId;
}

export class LoginCodeForShopResponseDto {
  @Expose() code: string;
  @Expose() expiresAt: Date;
  @Expose() tgBotUrl: string;
}
