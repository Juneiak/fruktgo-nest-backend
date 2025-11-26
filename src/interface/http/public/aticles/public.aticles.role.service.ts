import { Injectable, Inject, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { checkId } from "src/common/utils";
import { ArticlePort, ARTICLE_PORT, ArticleQueries, ArticleEnums } from "src/modules/article";
import { 
  ArticleFullResponseDto, 
  ArticlePreviewResponseDto,
} from './public.aticles.response.dtos';
import { PublicArticlesQueryDto } from './public.aticles.query.dtos';
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';

import {
  PaginatedResponseDto,
  transformPaginatedResult,
  PaginationQueryDto
} from 'src/interface/http/shared';


@Injectable()
export class PublicArticlesRoleService {
  constructor(
    @Inject(ARTICLE_PORT) private readonly articlePort: ArticlePort,
  ) {}

  // Получение опубликованной статьи (для публики)
  async getPublishedArticle(articleId: string): Promise<ArticleFullResponseDto> {
    try {
      const query = new ArticleQueries.GetArticleQuery(articleId);
      const article = await this.articlePort.getArticle(query);
      
      // Проверяем что статья существует и опубликована
      if (!article || article.status !== ArticleEnums.ArticleStatus.PUBLISHED) {
        throw new NotFoundException('Статья не найдена');
      }

      // Увеличиваем счетчик просмотров
      await this.articlePort.incrementView(articleId);

      return plainToInstance(ArticleFullResponseDto, article);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Статья не найдена'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID статьи'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  // Получение списка опубликованных статей (для публики)
  async getPublishedArticles(
    queryDto: PublicArticlesQueryDto,
    paginationDto: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ArticlePreviewResponseDto>> {
    try {
      // Формируем запрос только для опубликованных статей
      const query = new ArticleQueries.GetArticlesQuery({
        statuses: [ArticleEnums.ArticleStatus.PUBLISHED],
        targetAudience: queryDto.targetAudience,
      });

      // Формируем опции пагинации
      const queryOptions: CommonListQueryOptions<'createdAt'> = {
        pagination: paginationDto,
      };
      
      const result = await this.articlePort.getArticles(query, queryOptions);
      
      return transformPaginatedResult(result, ArticlePreviewResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные параметры фильтрации'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }
}
