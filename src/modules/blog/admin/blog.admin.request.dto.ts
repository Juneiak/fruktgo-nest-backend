import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ArticleStatus, ArticleTargetAudience } from '../article.schema';
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

  @IsEnum(ArticleTargetAudience)
  @Transform(transformDtoToFormDataString)
  @IsOptional()
  targetAudience?: ArticleTargetAudience;
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

  @IsEnum(ArticleTargetAudience)
  @IsOptional()
  @Transform(transformDtoToFormDataString)
  targetAudience?: ArticleTargetAudience;

  @IsEnum(ArticleStatus)
  @IsOptional()
  @Transform(transformDtoToFormDataString)
  status?: ArticleStatus;
}