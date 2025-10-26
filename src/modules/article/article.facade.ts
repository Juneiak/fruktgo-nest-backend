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

/**
 * Фасад для модуля статей
 */
@Injectable()
export class ArticleFacade implements ArticlePort {
  constructor(private readonly articleService: ArticleService) {}

  // ====================================================
  // QUERIES
  // ==================================================== 

  /**
   * Получить одну статью по ID
   */
  async getArticle(articleId: string, options?: CommonQueryOptions): Promise<Article | null> {
    return this.articleService.getArticle(articleId, options);
  }

  /**
   * Получить список статей с фильтрами
   */
  async getArticles(query: GetArticlesQuery, options?: CommonQueryOptions): Promise<Article[]> {
    return this.articleService.getArticles(query, options);
  }

  // ====================================================
  // COMMANDS
  // ==================================================== 

  /**
   * Создать статью
   */
  async createArticle(command: CreateArticleCommand, options?: CommonCommandOptions): Promise<Article> {
    return this.articleService.createArticle(command, options);
  }

  /**
   * Обновить статью
   */
  async updateArticle(command: UpdateArticleCommand, options?: CommonCommandOptions): Promise<void> {
    return this.articleService.updateArticle(command, options);
  }

  /**
   * Изменить статус статьи
   */
  async changeStatus(command: ChangeArticleStatusCommand, options?: CommonCommandOptions): Promise<void> {
    return this.articleService.changeStatus(command, options);
  }

  /**
   * Удалить статью
   */
  async deleteArticle(articleId: string, options?: CommonCommandOptions): Promise<void> {
    return this.articleService.deleteArticle(articleId, options);
  }

  /**
   * Увеличить счетчик просмотров
   */
  async incrementView(articleId: string, options?: CommonCommandOptions): Promise<void> {
    return this.articleService.incrementView(articleId, options);
  }
}