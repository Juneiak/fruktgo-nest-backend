import { Article } from './article.schema';
import { CommonQueryOptions } from 'src/common/types/queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import {
  CreateArticleCommand,
  UpdateArticleCommand,
  ChangeArticleStatusCommand,
} from './article.commands';
import { GetArticlesQuery } from './article.queries';

/**
 * Порт для работы со статьями
 */
export interface ArticlePort {
  // ====================================================
  // QUERIES
  // ==================================================== 

  /**
   * Получить одну статью по ID
   */
  getArticle(articleId: string, options?: CommonQueryOptions): Promise<Article | null>;

  /**
   * Получить список статей с фильтрами
   */
  getArticles(query: GetArticlesQuery, options?: CommonQueryOptions): Promise<Article[]>;

  // ====================================================
  // COMMANDS
  // ==================================================== 

  /**
   * Создать статью
   */
  createArticle(command: CreateArticleCommand, options?: CommonCommandOptions): Promise<Article>;

  /**
   * Обновить статью
   */
  updateArticle(command: UpdateArticleCommand, options?: CommonCommandOptions): Promise<void>;

  /**
   * Изменить статус статьи
   */
  changeStatus(command: ChangeArticleStatusCommand, options?: CommonCommandOptions): Promise<void>;

  /**
   * Удалить статью
   */
  deleteArticle(articleId: string, options?: CommonCommandOptions): Promise<void>;

  /**
   * Увеличить счетчик просмотров
   */
  incrementView(articleId: string, options?: CommonCommandOptions): Promise<void>;
}

export const ARTICLE_PORT = Symbol('ARTICLE_PORT');
