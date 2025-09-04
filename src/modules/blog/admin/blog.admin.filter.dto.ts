import { IsEnum, IsOptional } from "class-validator";
import { ArticleTargetAudience } from "../article.schema";

export class ArticleQueryFilterDto {
  @IsEnum(ArticleTargetAudience)
  @IsOptional()
  targetAudience?: ArticleTargetAudience;
}