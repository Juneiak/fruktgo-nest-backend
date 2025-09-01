import { IsEnum, IsString } from "class-validator";
import { UserSex } from "src/common/types";

export class UpdateEmployeeDto {
  @IsEnum(UserSex)
  sex: UserSex;
  
  @IsString()
  birthDate: Date;
  
  @IsString()
  position: string | null;
  
  @IsString()
  salary: string | null;
  
  @IsString()
  pinnedTo: string;
  
  @IsString()
  sellerNote: string | null;
}