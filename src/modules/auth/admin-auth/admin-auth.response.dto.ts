import { Expose } from 'class-transformer';

export class LoginCodeResponseDto {
  @Expose() code: string;
  @Expose() expiresAt: Date;
  @Expose() tgBotUrl: string;
}

export class AdminAuthResponseDto {
  @Expose() adminId: string;
  @Expose() telegramId: string;
}
