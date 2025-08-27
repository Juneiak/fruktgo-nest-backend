import { IsEmail, IsNotEmpty, IsString, MinLength, IsNumber, IsDate } from 'class-validator';
import { Expose, Exclude, Type } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types';
import { IsValidPhoneNumber } from 'src/common/validators';
import { Types } from 'mongoose';


export class RegisterSellerDto {
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
}


export class SellerAuthDto {
  @Expose()
  sellerId: string;

  @Expose()
  isBlocked: boolean;

  @Expose()
  telegramId: number;

  @Expose()
  verifiedStatus: VerifiedStatus;
}


export class ShopAuthDto {
  @Expose()
  shopId: string;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  @Type(() => String)
  owner: Types.ObjectId;
}


export class LoginCodeForSellerDto {
  @IsString()
  code: string;

  @IsDate()
  expiresAt: Date;

  @IsString()
  tgBotUrl: string;
}

export class LoginCodeForShopDto {
  @IsString()
  code: string;

  @IsDate()
  expiresAt: Date;

  @IsString()
  tgBotUrl: string;
}
