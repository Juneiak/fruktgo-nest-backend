import { IsMongoId, IsNotEmpty } from "class-validator";

export class ShiftFilterDto {
  @IsNotEmpty()
  @IsMongoId()
  shopId: string;
}