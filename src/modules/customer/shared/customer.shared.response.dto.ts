import { Expose } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types';

export class CustomerPreviewResponseDto {
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() customerName: string;
  @Expose() phone: string;
  @Expose() bonusPoints: number;
  @Expose() telegramUsername?: string;
  @Expose() telegramId: number;
  @Expose() customerId: string;
}
