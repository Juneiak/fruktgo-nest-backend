import { IsEnum, IsOptional, IsArray, IsDate } from "class-validator";
import { Type } from "class-transformer";
import { ArticleEnums } from "src/modules/article";

export class ArticleQueryDto {
  @IsEnum(ArticleEnums.ArticleStatus, { each: true })
  @IsArray()
  @IsOptional()
  statuses?: ArticleEnums.ArticleStatus[];

  @IsEnum(ArticleEnums.ArticleAuthorType)
  @IsOptional()
  authorType?: ArticleEnums.ArticleAuthorType;

  @IsEnum(ArticleEnums.ArticleTargetAudience)
  @IsOptional()
  targetAudience?: ArticleEnums.ArticleTargetAudience;

  @IsEnum(ArticleEnums.ArtcilesTag, { each: true })
  @IsArray()
  @IsOptional()
  tags?: ArticleEnums.ArtcilesTag[];

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  fromDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  toDate?: Date;
}