import { Article } from './article.schema';
import { CommonQueryOptions } from 'src/common/types/queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import {
  CreateArticleCommand,
  UpdateArticleCommand,
  ChangeArticleStatusCommand,
} from './article.commands';
import { GetArticlesQuery } from './article.queries';

export interface ArticlePort {

  // ====================================================
  // QUERIES
  // ==================================================== 
  getArticle(articleId: string, queryOptions?: CommonQueryOptions): Promise<Article | null>;
  getArticles(query: GetArticlesQuery, queryOptions?: CommonQueryOptions): Promise<Article[]>;


  // ====================================================
  // COMMANDS
  // ==================================================== 
  createArticle(command: CreateArticleCommand, commandOptions?: CommonCommandOptions): Promise<Article>;
  updateArticle(command: UpdateArticleCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  changeStatus(command: ChangeArticleStatusCommand, commandOptions?: CommonCommandOptions): Promise<void>;
  deleteArticle(articleId: string, commandOptions?: CommonCommandOptions): Promise<void>;
  incrementView(articleId: string, commandOptions?: CommonCommandOptions): Promise<void>;
}

export const ARTICLE_PORT = Symbol('ARTICLE_PORT');
