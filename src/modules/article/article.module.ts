import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Article, ArticleSchema } from './article.schema';
import { ArticleService } from './article.service';
import { ArticleFacade } from './article.facade';
import { ARTICLE_PORT } from './article.port';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Article.name, schema: ArticleSchema }]),
  ],
  providers: [
    ArticleService,
    ArticleFacade,
    { provide: ARTICLE_PORT, useExisting: ArticleFacade }
  ],
  exports: [ARTICLE_PORT],
})
export class ArticleModule {}