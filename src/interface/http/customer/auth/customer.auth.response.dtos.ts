import { Expose } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types';
import { Blocked } from 'src/common/schemas/common-schemas';


export class CustomerAuthResponseDto {
  @Expose() customerId: string;
  @Expose() customerName: string;
  @Expose() telegramId: string;
  @Expose() blocked: Blocked;
  @Expose() verifiedStatus: VerifiedStatus;
}


export class LoginCodeResponseDto {
  @Expose() code: string;
  @Expose() expiresAt: Date;
  @Expose() tgBotUrl: string;
}
