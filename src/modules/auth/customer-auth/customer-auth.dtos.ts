import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types';
import { IsValidPhoneNumber } from 'src/common/validators';

export class RegisterCustomerDto {
  @IsString()
  @IsValidPhoneNumber()
  @IsNotEmpty({ message: 'Телефон обязательно' })
  phone: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Telegram ID обязательно' })
  telegramId: number;

  @IsString()
  @IsNotEmpty({ message: 'Telegram username обязательно' })
  telegramUsername: string;

  @IsString()
  @IsNotEmpty({ message: 'Telegram имя обязательно' })
  telegramFirstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Telegram фамилия обязательно' })
  telegramLastName: string;

  @IsString()
  @IsNotEmpty({ message: 'Имя обязательно' })
  customerName: string;
};


export class CustomerAuthDto {
  @Expose()
  customerId: string;

  @Expose()
  customerName: string;

  @Expose()
  telegramId: string;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;
}


export class LoginCodeForCustomerDto {
  @Expose()
  code: string;

  @Expose()
  expiresAt: Date;

  @Expose()
  tgBotUrl: string;
}
