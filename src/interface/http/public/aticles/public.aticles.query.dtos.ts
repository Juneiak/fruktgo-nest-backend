import { IsEnum, IsOptional } from "class-validator";
import { ArticleTargetAudience } from "src/modules/article/article.enums";

export class PublicArticlesQueryDto {
  @IsEnum(ArticleTargetAudience)
  @IsOptional()
  targetAudience?: ArticleTargetAudience;
}
