import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { checkId, transformPaginatedResult } from "src/common/utils";
import { ArticlePort, ARTICLE_PORT } from "src/modules/article/article.port";
import { GetArticlesQuery } from 'src/modules/article/article.queries';
import { ArticleStatus } from 'src/modules/article/article.enums';
import { 
  ArticleFullResponseDto, 
  ArticlePreviewResponseDto,
} from './public.aticles.response.dtos';
import { PublicArticlesQueryDto } from './public.aticles.query.dtos';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { CommonListQueryOptions } from 'src/common/types/queries';

@Injectable()
export class PublicArticlesRoleService {
  constructor(
    @Inject(ARTICLE_PORT) private readonly articlePort: ArticlePort,
  ) {}

  // Получение опубликованной статьи (для публики)
  async getPublishedArticle(articleId: string): Promise<ArticleFullResponseDto> {
    checkId([articleId]);
    
    const article = await this.articlePort.getArticle(articleId);
    
    // Проверяем что статья существует и опубликована
    if (!article || article.status !== ArticleStatus.PUBLISHED) {
      throw new NotFoundException('Статья не найдена');
    }

    // Увеличиваем счетчик просмотров асинхронно (без ожидания)
    this.articlePort.incrementView(articleId).catch(() => {
      // Игнорируем ошибку, чтобы не прерывать выдачу статьи
    });
    
    return plainToInstance(ArticleFullResponseDto, article, { excludeExtraneousValues: true });
  }


  // Получение списка опубликованных статей (для публики)
  async getPublishedArticles(
    queryDto: PublicArticlesQueryDto,
    paginationDto: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ArticlePreviewResponseDto>> {
    // Формируем запрос только для опубликованных статей
    const query = new GetArticlesQuery({
      statuses: [ArticleStatus.PUBLISHED],
      targetAudience: queryDto.targetAudience,
    });

    // Формируем опции пагинации
    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationDto,
    };
    
    const result = await this.articlePort.getArticles(query, queryOptions);
    
    return transformPaginatedResult(result, ArticlePreviewResponseDto);
  }
}
