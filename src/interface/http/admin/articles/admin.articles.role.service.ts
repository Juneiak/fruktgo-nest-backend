import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { checkId, transformPaginatedResult } from "src/common/utils";
import { AuthenticatedUser } from "src/common/types";
import { CommonListQueryOptions } from 'src/common/types/queries';
import {
  ArticlePort,
  ARTICLE_PORT,
  ArticleCommands,
  ArticleQueries,
} from "src/modules/article";
import {
  CreateArticleDto,
  UpdateArticleDto,
  ChangeArticleStatusDto,
} from './admin.articles.request.dtos';
import {
  ArticleFullResponseDto, 
  ArticlePreviewResponseDto,
} from './admin.articles.response.dtos';
import { ArticleQueryDto } from './admin.articles.query.dtos';
import { PaginationQueryDto } from 'src/interface/http/common/common.query.dtos';
import { PaginatedResponseDto } from 'src/interface/http/common/common.response.dtos';


@Injectable()
export class AdminArticlesRoleService {
  constructor(
    @Inject(ARTICLE_PORT) private readonly articlePort: ArticlePort,
  ) {}

  async getArticle(
    authedAdmin: AuthenticatedUser,
    articleId: string,
  ): Promise<ArticleFullResponseDto> {
    checkId([articleId]);

    const article = await this.articlePort.getArticle(articleId);
    if (!article) throw new NotFoundException('Статья не найдена');

    return plainToInstance(ArticleFullResponseDto, article);
  }


  async getArticles(
    authedAdmin: AuthenticatedUser,
    queryDto: ArticleQueryDto,
    paginationDto: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ArticlePreviewResponseDto>> {
    // Формируем запрос с фильтрами
    const query = new ArticleQueries.GetArticlesQuery({
      statuses: queryDto.statuses,
      authorType: queryDto.authorType,
      targetAudience: queryDto.targetAudience,
      tags: queryDto.tags,
      fromDate: queryDto.fromDate,
      toDate: queryDto.toDate,
    });

    // Формируем опции пагинации
    const queryOptions: CommonListQueryOptions<'createdAt'> = {
      pagination: paginationDto
    };

    const result = await this.articlePort.getArticles(query, queryOptions);

    return transformPaginatedResult(result, ArticlePreviewResponseDto);
  }


  async createArticle(
    authedAdmin: AuthenticatedUser,
    dto: CreateArticleDto,
    articleImage?: Express.Multer.File,
  ): Promise<ArticleFullResponseDto> {
    // Создаем команду для создания артикля
    const command = new ArticleCommands.CreateArticleCommand({
      title: dto.title,
      content: dto.content,
      targetAudience: dto.targetAudience,
      tags: dto.tags || [],
      articleImageFile: articleImage,
    });

    const article = await this.articlePort.createArticle(command);

    return plainToInstance(ArticleFullResponseDto, article);
  }


  async updateArticle(
    authedAdmin: AuthenticatedUser,
    articleId: string,
    dto: UpdateArticleDto,
    articleImage?: Express.Multer.File,
  ): Promise<ArticleFullResponseDto> {
    checkId([articleId]);

    // Проверяем существование артикля
    const existingArticle = await this.articlePort.getArticle(articleId);
    if (!existingArticle) throw new NotFoundException('Статья не найдена');

    // Формируем команду обновления
    const command = new ArticleCommands.UpdateArticleCommand(
      articleId,
      {
        title: dto.title,
        content: dto.content,
        targetAudience: dto.targetAudience,
        tags: dto.tags,
        status: dto.status,
        articleImageFile: articleImage,
      }
    );

    await this.articlePort.updateArticle(command);
    
    // Получаем обновленную статью
    const updatedArticle = await this.articlePort.getArticle(articleId);

    return plainToInstance(ArticleFullResponseDto, updatedArticle);
  }


  async changeArticleStatus(
    authedAdmin: AuthenticatedUser,
    articleId: string,
    dto: ChangeArticleStatusDto,
  ): Promise<ArticleFullResponseDto> {
    checkId([articleId]);

    // Проверяем существование артикля
    const existingArticle = await this.articlePort.getArticle(articleId);
    if (!existingArticle) throw new NotFoundException('Статья не найдена');

    // Формируем команду изменения статуса
    const command = new ArticleCommands.ChangeArticleStatusCommand(
      articleId,
      { status: dto.status }
    );

    await this.articlePort.changeStatus(command);
    
    // Получаем обновленную статью
    const updatedArticle = await this.articlePort.getArticle(articleId);

    return plainToInstance(ArticleFullResponseDto, updatedArticle);
  }


  async deleteArticle(
    authedAdmin: AuthenticatedUser,
    articleId: string,
  ): Promise<void> {
    checkId([articleId]);

    // Проверяем существование артикля
    const existingArticle = await this.articlePort.getArticle(articleId);
    if (!existingArticle) throw new NotFoundException('Статья не найдена');

    await this.articlePort.deleteArticle(articleId);
  }


  
}
