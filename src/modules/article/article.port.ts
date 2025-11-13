import { Article } from './article.schema';
import { PaginateResult } from 'mongoose';
import { CommonQueryOptions, CommonListQueryOptions } from 'src/common/types/queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import {
  CreateArticleCommand,
  UpdateArticleCommand,
  ChangeArticleStatusCommand,
} from './article.commands';
import { GetArticleQuery, GetArticlesQuery } from './article.queries';

export interface ArticlePort {

  // ====================================================
  // QUERIES
  // ==================================================== 
  getArticle(query: GetArticleQuery, queryOptions?: CommonQueryOptions): Promise<Article | null>;
  getArticles(query: GetArticlesQuery, queryOptions?: CommonListQueryOptions<'createdAt'>): Promise<PaginateResult<Article>>;


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
