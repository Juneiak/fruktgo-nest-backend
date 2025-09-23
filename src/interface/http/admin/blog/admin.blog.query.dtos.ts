import { IsEnum, IsOptional } from "class-validator";
import { ArticleTargetAudience } from "src/modules/blog/article.schema";

export class ArticleQueryDto {
  @IsEnum(ArticleTargetAudience)
  @IsOptional()
  targetAudience?: ArticleTargetAudience;
}