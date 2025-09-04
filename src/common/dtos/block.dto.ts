import { BlockStatus } from "../enums/common.enum";
import { IsOptional, IsEnum, IsString, IsDate } from "class-validator";

export class BlockDto {
  @IsEnum(BlockStatus)
  @IsOptional()
  status: BlockStatus;

  @IsString()
  @IsOptional()
  reason: string;

  @IsString()
  @IsOptional()
  code: string;

  @IsDate()
  @IsOptional()
  blockedUntil: Date;
}