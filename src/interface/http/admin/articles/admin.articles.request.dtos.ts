import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { ArticleEnums } from 'src/modules/article';
import { transformDtoToFormDataString } from 'src/common/utils';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  @Transform(transformDtoToFormDataString)
  title: string;

  @IsString()
  @IsNotEmpty()
  @Transform(transformDtoToFormDataString)
  content: string;

  @IsEnum(ArticleEnums.ArticleTargetAudience)
  @Transform(transformDtoToFormDataString)
  @IsNotEmpty()
  targetAudience: ArticleEnums.ArticleTargetAudience;

  @IsEnum(ArticleEnums.ArtcilesTag, { each: true })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter(Boolean);
    }
    return value || [];
  })
  tags?: ArticleEnums.ArtcilesTag[];
}


export class UpdateArticleDto {
  @IsString()
  @IsOptional()
  @Transform(transformDtoToFormDataString)
  title?: string;

  @IsString()
  @IsOptional()
  @Transform(transformDtoToFormDataString)
  content?: string;

  @IsEnum(ArticleEnums.ArticleTargetAudience)
  @IsOptional()
  @Transform(transformDtoToFormDataString)
  targetAudience?: ArticleEnums.ArticleTargetAudience;

  @IsEnum(ArticleEnums.ArticleStatus)
  @IsOptional()
  @Transform(transformDtoToFormDataString)
  status?: ArticleEnums.ArticleStatus;

  @IsEnum(ArticleEnums.ArtcilesTag, { each: true })
  @IsArray()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').filter(Boolean);
    }
    return value || [];
  })
  tags?: ArticleEnums.ArtcilesTag[];
}


export class ChangeArticleStatusDto {
  @IsEnum(ArticleEnums.ArticleStatus)
  status: ArticleEnums.ArticleStatus;
}
