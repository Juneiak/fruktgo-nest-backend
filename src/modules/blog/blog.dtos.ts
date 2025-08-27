import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsObject, IsDateString, IsNumber } from 'class-validator';
import { Exclude, Expose, Type, Transform } from 'class-transformer';
import { ArticleStatus, ArticleTargetAudience } from './article.schema';
import { ArtcilesTag } from './article.schema';
import { SwaggerSchemaProperties } from 'src/common/swagger/api-form-data.decorator';
import { transformDtoToFormDataString, transformDtoToFormDataArray } from 'src/common/utils';

// DTO для создания статьи
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
  targetAudience: ArticleTargetAudience;
}

export const CreateArticleFormDataDto: SwaggerSchemaProperties = {
  title: { type: 'string', example: 'Сезонные фрукты: что покупать весной', description: 'Заголовок статьи' },
  content: { type: 'string', example: 'Содержание статьи...', description: 'Содержание статьи' },
  targetAudience: { type: 'string', example: ArticleTargetAudience.ALL, description: 'Целевая аудитория статьи' },
  articleImage: { type: 'file', description: 'Изображение для статьи' }
};

// DTO для обновления статьи
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

export const UpdateArticleFormDataDto: SwaggerSchemaProperties = {
  title: { type: 'string', example: 'Обновленный заголовок статьи', description: 'Заголовок статьи' },
  content: { type: 'string', example: 'Обновленное содержание статьи...', description: 'Содержание статьи' },
  targetAudience: { type: 'string', example: ArticleTargetAudience.ALL, description: 'Целевая аудитория статьи' },
  status: { type: 'string', example: ArticleStatus.PUBLISHED, description: 'Статус статьи' },
  articleImage: { type: 'file', description: 'Изображение для статьи' }
};


export class ArticleFullResponseDto {
  @Expose()
  articleId: string;

  @Expose()
  title: string;

  @Expose()
  content: string;

  @Expose()
  @Type(() => String)
  articleImage: string | null;

  @Expose()
  @Type(() => String)
  targetAudience: ArticleTargetAudience;

  @Expose()
  @Type(() => String)
  status: ArticleStatus;

  @Expose()
  viewCount: number;

  @Expose()
  createdAt: Date;

  @Expose()
  @Type(() => Date)
  publishedAt?: Date;

  @Expose()
  @Type(() => String)
  author: string;

  @Expose()
  @Type(() => String)
  authorType: string;
}

export class ArticlePreviewResponseDto {
  @Expose()
  articleId: string;

  @Expose()
  title: string;

  @Expose()
  @Type(() => String)
  articleImage: string | null;

  @Expose()
  contentPreview: string;

  @Expose()
  createdAt: Date;
}