import { Injectable } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticlePort } from './article.port';
import {
  CreateArticleCommand,
  UpdateArticleCommand,
  ChangeArticleStatusCommand,
} from './article.commands';
import { GetArticlesQuery } from './article.queries';
import { Article } from './article.schema';
import { CommonQueryOptions } from 'src/common/types/queries';
import { CommonCommandOptions } from 'src/common/types/commands';

@Injectable()
export class ArticleFacade implements ArticlePort {
  constructor(private readonly articleService: ArticleService) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getArticle(
    articleId: string,
    queryOptions?: CommonQueryOptions
  ): Promise<Article | null> {
    return this.articleService.getArticle(articleId, queryOptions);
  }

  async getArticles(
    query: GetArticlesQuery,
    queryOptions?: CommonQueryOptions
  ): Promise<Article[]> {
    return this.articleService.getArticles(query, queryOptions);
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createArticle(
    command: CreateArticleCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Article> {
    return this.articleService.createArticle(command, commandOptions);
  }

  async updateArticle(
    command: UpdateArticleCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.articleService.updateArticle(command, commandOptions);
  }

  async changeStatus(
    command: ChangeArticleStatusCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.articleService.changeStatus(command, commandOptions);
  }

  async deleteArticle(
    articleId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.articleService.deleteArticle(articleId, commandOptions);
  }

  async incrementView(
    articleId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    return this.articleService.incrementView(articleId, commandOptions);
  }
}