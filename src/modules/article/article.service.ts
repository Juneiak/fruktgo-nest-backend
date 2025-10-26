import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Article, ArticleModel } from './article.schema';
import { Types } from 'mongoose';
import {
  CreateArticleCommand,
  UpdateArticleCommand,
  ChangeArticleStatusCommand,
} from './article.commands';
import { GetArticlesQuery } from './article.queries';
import { CommonQueryOptions } from 'src/common/types/queries';
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

  /**
   * Получить одну статью по ID
   */
  async getArticle(
    articleId: string,
    options?: CommonQueryOptions
  ): Promise<Article | null> {
    checkId([articleId]);

    const dbQuery = this.articleModel.findById(new Types.ObjectId(articleId));
    if (options?.session) dbQuery.session(options.session);

    const article = await dbQuery.lean({ virtuals: true }).exec();
    return article;
  }

  /**
   * Получить список статей с фильтрами
   */
  async getArticles(
    query: GetArticlesQuery,
    options?: CommonQueryOptions
  ): Promise<Article[]> {
    const { filters } = query;

    const queryFilter: any = {};
    if (filters?.statuses && filters.statuses.length > 0) queryFilter.status = { $in: filters.statuses };
    if (filters?.authorType) queryFilter.authorType = filters.authorType;
    if (filters?.targetAudience) queryFilter.targetAudience = filters.targetAudience;
    if (filters?.tags && filters.tags.length > 0) {
      queryFilter.tags = { $in: filters.tags };
    }
    if (filters?.fromDate || filters?.toDate) {
      queryFilter.createdAt = {};
      if (filters.fromDate) queryFilter.createdAt.$gte = filters.fromDate;
      if (filters.toDate) queryFilter.createdAt.$lte = filters.toDate;
    }

    const dbQuery = this.articleModel.find(queryFilter).sort({ createdAt: -1 });
    if (options?.session) dbQuery.session(options.session);

    const articles = await dbQuery.lean({ virtuals: true }).exec();
    return articles;
  }


  // ====================================================
  // COMMANDS
  // ====================================================

  /**
   * Создать статью
   */
  async createArticle(
    command: CreateArticleCommand,
    options?: CommonCommandOptions
  ): Promise<Article> {
    const { title, content, targetAudience, tags, articleImageFile } = command;

    const contentPreview = content.slice(0, 200);

    // Создаем статью без изображения
    const article = new this.articleModel({
      title,
      content,
      contentPreview,
      targetAudience,
      tags,
      authorType: ArticleAuthorType.ADMIN,
      status: ArticleStatus.DRAFT,
      publishedAt: undefined,
      articleImage: undefined,
      viewCount: 0,
    });

    // Загружаем изображение если передано
    if (articleImageFile) {
      const uploadedImage = await this.imagesPort.uploadImage(
        new UploadImageCommand(articleImageFile, {
          accessLevel: ImageAccessLevel.PUBLIC,
          entityType: ImageEntityType.ARTICLE,
          entityId: article._id.toString(),
          imageType: ImageType.ARTICLE_IMAGE,
        }),
        options || {}
      );

      article.articleImage = new Types.ObjectId(uploadedImage.id);
    }

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await article.save(saveOptions);

    return article.toObject({ virtuals: true });
  }

  /**
   * Обновить статью
   */
  async updateArticle(
    command: UpdateArticleCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { articleId, title, content, targetAudience, tags, status, articleImageFile } = command;
    checkId([articleId]);

    const dbQuery = this.articleModel.findById(new Types.ObjectId(articleId));
    if (options?.session) dbQuery.session(options.session);

    const article = await dbQuery.exec();
    if (!article) throw DomainError.notFound('Article', articleId);

    assignField(article, 'title', title);
    if (content !== undefined) {
      article.content = content;
      article.contentPreview = content.slice(0, 200);
    }
    assignField(article, 'targetAudience', targetAudience);
    assignField(article, 'tags', tags);
    assignField(article, 'status', status);

    // Работа с изображениями
    if (articleImageFile !== undefined) {
      const oldImageId = article.articleImage?.toString();

      if (articleImageFile === null) {
        // Удалить изображение
        if (oldImageId) {
          await this.imagesPort.deleteImage(oldImageId, options || {});
          article.articleImage = undefined;
        }
      } else {
        // Загрузить новое изображение
        const uploadedImage = await this.imagesPort.uploadImage(
          new UploadImageCommand(articleImageFile, {
            accessLevel: ImageAccessLevel.PUBLIC,
            entityType: ImageEntityType.ARTICLE,
            entityId: article._id.toString(),
            imageType: ImageType.ARTICLE_IMAGE,
          }),
          options || {}
        );

        // Удалить старое изображение если было
        if (oldImageId) {
          await this.imagesPort.deleteImage(oldImageId, options || {});
        }

        article.articleImage = new Types.ObjectId(uploadedImage.id);
      }
    }

    // Установить publishedAt при первой публикации
    if (status === ArticleStatus.PUBLISHED && !article.publishedAt) {
      article.publishedAt = new Date();
    }

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await article.save(saveOptions);
  }

  /**
   * Изменить статус статьи
   */
  async changeStatus(
    command: ChangeArticleStatusCommand,
    options?: CommonCommandOptions
  ): Promise<void> {
    const { articleId, status } = command;
    checkId([articleId]);

    const dbQuery = this.articleModel.findById(new Types.ObjectId(articleId));
    if (options?.session) dbQuery.session(options.session);

    const article = await dbQuery.exec();
    if (!article) throw DomainError.notFound('Article', articleId);

    article.status = status;
    
    // Установить publishedAt при первой публикации
    if (status === ArticleStatus.PUBLISHED && !article.publishedAt) {
      article.publishedAt = new Date();
    }

    const saveOptions: any = {};
    if (options?.session) saveOptions.session = options.session;
    await article.save(saveOptions);
  }

  /**
   * Удалить статью
   */
  async deleteArticle(
    articleId: string,
    options?: CommonCommandOptions
  ): Promise<void> {
    checkId([articleId]);

    const deleteQuery = this.articleModel.deleteOne({ _id: new Types.ObjectId(articleId) });
    if (options?.session) deleteQuery.session(options.session);

    const result = await deleteQuery.exec();
    if (result.deletedCount === 0) throw DomainError.notFound('Article', articleId);
  }

  /**
   * Увеличить счетчик просмотров
   */
  async incrementView(
    articleId: string,
    options?: CommonCommandOptions
  ): Promise<void> {
    checkId([articleId]);

    const updateQuery = this.articleModel.findByIdAndUpdate(
      new Types.ObjectId(articleId),
      { $inc: { viewCount: 1 } }
    );
    if (options?.session) updateQuery.session(options.session);

    await updateQuery.exec();
  }
}