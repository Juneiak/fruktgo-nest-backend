import { IsString, IsNotEmpty } from 'class-validator';
import { IsValidPhoneNumber } from 'src/common/validators';

export class CreateJobApplicationDto {
  @IsString()
  @IsValidPhoneNumber()
  @IsNotEmpty({ message: 'Телефон сотрудника обязателен' })
  employeePhone: string;
}
