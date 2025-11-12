import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Article, ArticleModel } from './article.schema';
import { Types, PaginateResult } from 'mongoose';
import {
  CreateArticleCommand,
  UpdateArticleCommand,
  ChangeArticleStatusCommand,
} from './article.commands';
import { GetArticlesQuery } from './article.queries';
import { CommonQueryOptions, CommonListQueryOptions } from 'src/common/types/queries';
import { CommonCommandOptions } from 'src/common/types/commands';
import { checkId, assignField } from 'src/common/utils';
import { DomainError } from 'src/common/errors/domain-error';
import { ArticleStatus, ArticleAuthorType } from './article.enums';
import { IMAGES_PORT, ImagesPort } from 'src/infra/images/images.port';
import { UploadImageCommand } from 'src/infra/images/images.commands';
import { ImageAccessLevel, ImageEntityType, ImageType } from 'src/infra/images/images.enums';

@Injectable()
export class ArticleService {
  constructor(
    @InjectModel(Article.name) private readonly articleModel: ArticleModel,
    @Inject(IMAGES_PORT) private readonly imagesPort: ImagesPort,
  ) {}

  // ====================================================
  // QUERIES
  // ====================================================
  async getArticle(
    articleId: string,
    queryOptions?: CommonQueryOptions
  ): Promise<Article | null> {
    checkId([articleId]);

    const dbQuery = this.articleModel.findById(new Types.ObjectId(articleId));
    if (queryOptions?.session) dbQuery.session(queryOptions.session);

    const article = await dbQuery.lean({ virtuals: true }).exec();
    return article;
  }


  async getArticles(
    query: GetArticlesQuery,
    queryOptions?: CommonListQueryOptions<'createdAt'>
  ): Promise<PaginateResult<Article>> {
    const { filters } = query;

    const dbQueryFilter: any = {};
    if (filters?.statuses && filters.statuses.length > 0) dbQueryFilter.status = { $in: filters.statuses };
    if (filters?.authorType) dbQueryFilter.authorType = filters.authorType;
    if (filters?.targetAudience) dbQueryFilter.targetAudience = filters.targetAudience;
    if (filters?.tags && filters.tags.length > 0) {
      dbQueryFilter.tags = { $in: filters.tags };
    }
    if (filters?.fromDate || filters?.toDate) {
      dbQueryFilter.createdAt = {};
      if (filters.fromDate) dbQueryFilter.createdAt.$gte = filters.fromDate;
      if (filters.toDate) dbQueryFilter.createdAt.$lte = filters.toDate;
    }

    const dbQueryOptions: any = {
      page: queryOptions?.pagination?.page || 1,
      limit: queryOptions?.pagination?.pageSize || 10,
      lean: true,
      leanWithId: true,
      sort: queryOptions?.sort || { createdAt: -1 },
    };
    
    const result = await this.articleModel.paginate(dbQueryFilter, dbQueryOptions);
    return result;
  }


  // ====================================================
  // COMMANDS
  // ====================================================
  async createArticle(
    command: CreateArticleCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<Article> {
    const { payload, articleId } = command;

    const articleIdToCreate = articleId ? new Types.ObjectId(articleId) : new Types.ObjectId();

    // Создаем статью с указанным ID или автоматическим
    const articleData: any = {
      _id: articleIdToCreate,
      title: payload.title,
      content: payload.content,
      contentPreview: payload.content.slice(0, 200),
      targetAudience: payload.targetAudience,
      tags: payload.tags,
      authorType: ArticleAuthorType.ADMIN,
      status: ArticleStatus.DRAFT,
      publishedAt: undefined,
      viewCount: 0,
    };

    // Загружаем изображение если передано
    if (payload.articleImageFile) {
      const imageId = new Types.ObjectId();
      await this.imagesPort.uploadImage(
        new UploadImageCommand(imageId.toString(), {
          imageFile: payload.articleImageFile,
          accessLevel: ImageAccessLevel.PUBLIC,
          entityType: ImageEntityType.ARTICLE,
          entityId: articleIdToCreate.toString(),
          imageType: ImageType.ARTICLE_IMAGE,
        }),
        commandOptions
      );

      articleData.articleImage = imageId;
    }

    const createOptions: any = {};
    if (commandOptions?.session) createOptions.session = commandOptions.session;
    const article = await this.articleModel.create([articleData], createOptions).then(docs => docs[0]);

    return article.toObject({ virtuals: true });
  }


  async updateArticle(
    command: UpdateArticleCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { articleId, payload } = command;
    checkId([articleId]);

    const dbQuery = this.articleModel.findById(new Types.ObjectId(articleId));
    if (commandOptions?.session) dbQuery.session(commandOptions.session);

    const article = await dbQuery.exec();
    if (!article) throw DomainError.notFound('Article', articleId);

    assignField(article, 'title', payload.title);
    assignField(article, 'targetAudience', payload.targetAudience);
    assignField(article, 'tags', payload.tags);
    assignField(article, 'status', payload.status);
    if (payload.content !== undefined) {
      article.content = payload.content;
      article.contentPreview = payload.content.slice(0, 200);
    }
    
    // Работа с изображениями
    if (payload.articleImageFile !== undefined) {
      const oldImageId = article.articleImage?.toString();

      if (payload.articleImageFile === null) {
        // Удалить изображение
        if (oldImageId) {
          await this.imagesPort.deleteImage(oldImageId, commandOptions);
          article.articleImage = undefined;
        }
      } else {
        // Загрузить новое изображение
        const imageId = new Types.ObjectId();
        await this.imagesPort.uploadImage(
          new UploadImageCommand(imageId.toString(), {
            imageFile: payload.articleImageFile,
            accessLevel: ImageAccessLevel.PUBLIC,
            entityType: ImageEntityType.ARTICLE,
            entityId: article._id.toString(),
            imageType: ImageType.ARTICLE_IMAGE,
          }),
          commandOptions
        );

        // Удалить старое изображение если было
        if (oldImageId) await this.imagesPort.deleteImage(oldImageId, commandOptions);

        article.articleImage = imageId;
      }
    }

    // Установить publishedAt при первой публикации
    if (payload.status === ArticleStatus.PUBLISHED && !article.publishedAt) {
      article.publishedAt = new Date();
    }

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    await article.save(saveOptions);
  }

  
  async changeStatus(
    command: ChangeArticleStatusCommand,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    const { articleId, payload } = command;
    checkId([articleId]);

    const dbQuery = this.articleModel.findById(new Types.ObjectId(articleId));
    if (commandOptions?.session) dbQuery.session(commandOptions.session);

    const article = await dbQuery.exec();
    if (!article) throw DomainError.notFound('Article', articleId);

    article.status = payload.status;
    
    // Установить publishedAt при первой публикации
    if (payload.status === ArticleStatus.PUBLISHED && !article.publishedAt) {
      article.publishedAt = new Date();
    }

    const saveOptions: any = {};
    if (commandOptions?.session) saveOptions.session = commandOptions.session;
    await article.save(saveOptions);
  }


  async deleteArticle(
    articleId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    checkId([articleId]);

    const deleteQuery = this.articleModel.deleteOne({ _id: new Types.ObjectId(articleId) });
    if (commandOptions?.session) deleteQuery.session(commandOptions.session);

    const result = await deleteQuery.exec();
    if (result.deletedCount === 0) throw DomainError.notFound('Article', articleId);
  }


  async incrementView(
    articleId: string,
    commandOptions?: CommonCommandOptions
  ): Promise<void> {
    checkId([articleId]);

    const updateQuery = this.articleModel.findByIdAndUpdate(
      new Types.ObjectId(articleId),
      { $inc: { viewCount: 1 } }
    );
    if (commandOptions?.session) updateQuery.session(commandOptions.session);

    await updateQuery.exec();
  }
}