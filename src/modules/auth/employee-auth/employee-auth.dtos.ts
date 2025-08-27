import { IsNotEmpty, IsString, IsNumber, IsDate } from 'class-validator';
import { Expose } from 'class-transformer';
import { VerifiedStatus } from 'src/common/types/index';
import { IsValidPhoneNumber } from 'src/common/validators';


export class EmployeeAuthDto {
  @Expose()
  employeeId: string;

  @Expose()
  isBlocked: boolean;

  @Expose()
  verifiedStatus: VerifiedStatus;

  @Expose()
  employeeName: string;

  @Expose()
  telegramId: string;

  @Expose()
  phone: string | null;

  @Expose()
  pinnedTo: string | null;

  @Expose()
  employer: string | null;
}


export class RegisterEmployeeDto {
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
  employeeName: string;
}

export class LoginCodeForEmployeeToShopResponseDto {
  @IsString()
  code: string;

  @IsDate()
  expiresAt: Date;

  @IsString()
  tgBotUrl: string;
}

export class LoginCodeForEmployeeToShopDto {
  @IsString()
  code: string;
}
