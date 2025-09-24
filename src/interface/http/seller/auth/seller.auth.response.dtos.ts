import { Expose } from 'class-transformer';
import { VerifiedStatus } from 'src/common/enums/common.enum';
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
