import { Injectable } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticlePort } from './article.port';
import { CreateArticleCommand, UpdateArticleCommand, BlockArticleCommand } from './article.commands';
import { GetArticlesQuery } from './article.queries';
import { Article } from './article.schema';
import { PaginateResult } from 'mongoose';
import { CommonCommandOptions } from 'src/common/types/comands';
import { CommonListQueryOptions, CommonQueryOptions } from 'src/common/types/queries';

@Injectable()
export class ArticleFacade implements ArticlePort {
  constructor(private readonly articleService: ArticleService) {}

  
}