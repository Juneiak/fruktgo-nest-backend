import { IsMongoId, IsNotEmpty } from "class-validator";

export class ShiftsQueryDto {
  @IsNotEmpty()
  @IsMongoId()
  shopId: string;
}