import { Expose } from 'class-transformer';

export class LoginCodeForAdminDto {
  @Expose()
  code: string;

  @Expose()
  expiresAt: Date;

  @Expose()
  tgBotUrl: string;
}

export class AdminAuthDto {
  @Expose()
  adminId: string;

  @Expose()
  telegramId: string;
}
