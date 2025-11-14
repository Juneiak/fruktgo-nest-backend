import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { checkId } from "src/common/utils";
import { AuthenticatedUser } from "src/common/types";
import { CommonListQueryOptions } from 'src/common/types/queries';
import { DomainErrorCode, handleServiceError } from 'src/common/errors/domain-error';
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
import {
  PaginationQueryDto,
  PaginatedResponseDto,
  transformPaginatedResult
} from 'src/interface/http/common';


@Injectable()
export class AdminArticlesRoleService {
  constructor(
    @Inject(ARTICLE_PORT) private readonly articlePort: ArticlePort,
  ) {}

  async getArticle(
    authedAdmin: AuthenticatedUser,
    articleId: string,
  ): Promise<ArticleFullResponseDto> {
    try {
      const article = await this.articlePort.getArticle(
        new ArticleQueries.GetArticleQuery(articleId)
      );
      return plainToInstance(ArticleFullResponseDto, article);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Статья не найдена'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID статьи'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async getArticles(
    authedAdmin: AuthenticatedUser,
    queryDto: ArticleQueryDto,
    paginationDto: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ArticlePreviewResponseDto>> {
    try {
      const result = await this.articlePort.getArticles(
        new ArticleQueries.GetArticlesQuery({
          statuses: queryDto.statuses,
          authorType: queryDto.authorType,
          targetAudience: queryDto.targetAudience,
          tags: queryDto.tags,
          fromDate: queryDto.fromDate,
          toDate: queryDto.toDate,
        }),
        { pagination: paginationDto }
      );

      return transformPaginatedResult(result, ArticlePreviewResponseDto);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректные параметры фильтрации'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async createArticle(
    authedAdmin: AuthenticatedUser,
    dto: CreateArticleDto,
    articleImage?: Express.Multer.File,
  ): Promise<ArticleFullResponseDto> {
    try {
      const article = await this.articlePort.createArticle(
        new ArticleCommands.CreateArticleCommand({
          title: dto.title,
          content: dto.content,
          targetAudience: dto.targetAudience,
          tags: dto.tags || [],
          articleImageFile: articleImage,
        })
      );

      return this.getArticle(authedAdmin, article._id.toString());
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.DB_DUPLICATE_KEY]: new ConflictException('Статья с таким названием уже существует'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных статьи'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async updateArticle(
    authedAdmin: AuthenticatedUser,
    articleId: string,
    dto: UpdateArticleDto,
    articleImage?: Express.Multer.File,
  ): Promise<ArticleFullResponseDto> {
    try {
      await this.articlePort.updateArticle(
        new ArticleCommands.UpdateArticleCommand(
          articleId,
          {
            title: dto.title,
            content: dto.content,
            targetAudience: dto.targetAudience,
            tags: dto.tags,
            status: dto.status,
            articleImageFile: articleImage,
          }
        )
      );
      return this.getArticle(authedAdmin, articleId);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Статья не найдена'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID статьи'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации данных статьи'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async changeArticleStatus(
    authedAdmin: AuthenticatedUser,
    articleId: string,
    dto: ChangeArticleStatusDto,
  ): Promise<ArticleFullResponseDto> {
    try {
      await this.articlePort.changeStatus(
        new ArticleCommands.ChangeArticleStatusCommand(
          articleId,
          { status: dto.status }
        )
      );
      return this.getArticle(authedAdmin, articleId);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Статья не найдена'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID статьи'),
        [DomainErrorCode.DB_VALIDATION_ERROR]: new BadRequestException('Ошибка валидации статуса статьи'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  async deleteArticle(
    authedAdmin: AuthenticatedUser,
    articleId: string,
  ): Promise<void> {
    try {
      await this.articlePort.deleteArticle(articleId);
    } catch (error) {
      handleServiceError(error, {
        [DomainErrorCode.NOT_FOUND]: new NotFoundException('Статья не найдена'),
        [DomainErrorCode.DB_CAST_ERROR]: new BadRequestException('Некорректный ID статьи'),
        [DomainErrorCode.OTHER]: new InternalServerErrorException('Внутренняя ошибка сервера'),
      });
    }
  }


  
}
