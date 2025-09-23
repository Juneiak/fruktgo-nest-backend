import { Expose } from 'class-transformer';
import { VerifiedStatus } from 'src/common/enums/common.enum';
import { Blocked } from 'src/common/schemas/common-schemas';

export class SystemStatsResponseDto {
  @Expose() customersCount: number;
  @Expose() employeesCount: number;
  @Expose() sellersCount: number;
  @Expose() shopsCount: number;
  @Expose() ordersCount: number;
}

export class UserToVerifyResponseDto {
  @Expose() id: string;
  @Expose() telegramId: number;
  @Expose() telegramUsername: string;
  @Expose() blocked: Blocked;
  @Expose() verifiedStatus: VerifiedStatus;
  @Expose() type: string; // Тип пользователя: Клиент, Сотрудник, Продавец, Магазин
  @Expose() createdAt: Date;
}