import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { IsValidPhoneNumber } from 'src/common/validators';

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