import { Expose } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types/index';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

export class EmployeeAuthResponseDto {
  @Expose() employeeId: string;
  @Expose() isBlocked: boolean;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() employeeName: string;
  @Expose() telegramId: string;
  @Expose() phone: string | null;
  @ExposeObjectId() pinnedTo: string | null;
  @ExposeObjectId() employer: string | null;
}

export class LoginCodeForEmployeeToShopResponseDto {
  @Expose() code: string;
  @Expose() expiresAt: Date;
  @Expose() tgBotUrl: string;
}