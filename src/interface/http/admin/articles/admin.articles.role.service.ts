import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateArticleDto,
  UpdateArticleDto 
} from './admin.articles.request.dtos';
import {
  ArticleFullResponseDto, 
  ArticlePreviewResponseDto,
} from './admin.articles.response.dtos';
import { plainToInstance } from 'class-transformer';
import { checkId } from "src/common/utils";
import { AuthenticatedUser } from "src/common/types";
import { ArticlePort, ARTICLE_PORT } from "src/modules/article/article.port";
import { ArticleQueryDto } from './admin.articles.query.dtos';


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
  ): Promise<ArticlePreviewResponseDto[]> {

    const query: GetArticlesQuery = {
      
    };
    const articles = await this.articlePort.getArticles(query);
    return plainToInstance(ArticlePreviewResponseDto, articles);
  }

  async updateArticle(
    authedAdmin: AuthenticatedUser,
    articleId: string,
    dto: UpdateArticleDto,
  ): Promise<ArticleFullResponseDto> {
    const article = await this.articlePort.updateArticle(articleId, dto);
    return article;
  }

  async changeStatus(
    authedAdmin: AuthenticatedUser,
    articleId: string,
    dto: ChangeArticleStatusDto,
  ) {
    const article = await this.articlePort.changeStatus(articleId, dto);
    return article;
  }
  
  async deleteArticle(
    authedAdmin: AuthenticatedUser,
    articleId: string,
  ) {
    const article = await this.articlePort.deleteArticle(articleId);
    return article;
  }


  
}
