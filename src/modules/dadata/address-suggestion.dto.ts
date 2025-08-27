import { IsString, IsOptional } from "class-validator";

export class AddressSuggestionDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  city?: string;
}
