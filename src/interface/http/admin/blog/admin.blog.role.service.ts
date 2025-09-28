import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Article, ArticleStatus, ArticleAuthorType } from 'src/modules/blog/article.schema';
import {
  CreateArticleDto,
  UpdateArticleDto 
} from './admin.blog.request.dtos';
import {
  ArticleFullResponseDto, 
  ArticlePreviewResponseDto,
} from './admin.blog.response.dtos';
import { plainToInstance } from 'class-transformer';
import { checkId } from "src/common/utils";
import { AuthenticatedUser } from "src/common/types";
import { UserType } from "src/common/enums/common.enum";
import { UploadsService } from "src/infra/images/images.service";
import { EntityType, ImageType } from "src/infra/images/infrastructure/image.schema";
import { ArticleQueryDto } from './admin.blog.query.dtos';


@Injectable()
export class AdminBlogRoleService {
  constructor(
    @InjectModel('Article') private articleModel: Model<Article>,
    private readonly uploadsService: UploadsService
  ) {}

  // Создание статьи (только для админов)
  async createArticle(
    authedAdmin: AuthenticatedUser,
    dto: CreateArticleDto,
    articleImage?: Express.Multer.File
  ): Promise<ArticleFullResponseDto> {
    const session = await this.articleModel.db.startSession();
    try {

    const createdArticleId = await session.withTransaction(async () => {
      // 1) создаём статью и сразу сохраняем
      const article = new this.articleModel({
        title: dto.title,
        content: dto.content,
        contentPreview: dto.content.slice(0, 200),
        targetAudience: dto.targetAudience,
        authorType: ArticleAuthorType.ADMIN,
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date(),
        articleImage: null,
      });

      await article.save({ session });

      // 2) опциональная загрузка изображения
      if (articleImage) {
        const createdImage = await this.uploadsService.uploadImage({
          file: articleImage,
          accessLevel: 'public',
          entityType: EntityType.article,
          entityId: article._id.toString(),
          imageType: ImageType.articleImage,
          session,
        });

        article.articleImage = createdImage._id;
        await article.save({ session });
      }
      return article._id.toString();
    });

      if (!createdArticleId) throw new NotFoundException('Не удалось создать статью');
      return this.getArticleDetail(authedAdmin, createdArticleId);

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
      console.error('Ошибка при создании статьи:', error);
      throw new InternalServerErrorException('Не удалось создать статью');
    } finally {
      session.endSession();
    }
  }


  // Обновление статьи (только для админов)
  async updateArticle(
    authedAdmin: AuthenticatedUser,
    articleId: string,
    dto: UpdateArticleDto,
    articleImage?: Express.Multer.File
  ): Promise<ArticleFullResponseDto> {
    checkId([articleId]);
    
    const session = await this.articleModel.db.startSession();
    try {
      const updatedArticleId = await session.withTransaction(async () => {
        const article = await this.articleModel.findById(new Types.ObjectId(articleId)).session(session);
        if (!article) throw new NotFoundException('Статья не найдена');

        if (dto.title !== undefined) article.title = dto.title;
        if (dto.content !== undefined) {
          article.content = dto.content;
          article.contentPreview = dto.content.slice(0, 200);
        }
        if (dto.targetAudience !== undefined) article.targetAudience = dto.targetAudience;
        if (dto.status !== undefined) article.status = dto.status;
        if (dto.status === ArticleStatus.PUBLISHED && !article.publishedAt) article.publishedAt = new Date();
        if (articleImage) {
          const oldImageId = article.articleImage || null;
          const createdImage = await this.uploadsService.uploadImage({
            file: articleImage,
            accessLevel: 'public',
            entityType: EntityType.article,
            entityId: article._id.toString(),
            imageType: ImageType.articleImage,
            allowedUsers: [{ userId: authedAdmin.id, role: UserType.ADMIN }],
            session
          });
          article.articleImage = createdImage._id;
          if (oldImageId) await this.uploadsService.deleteFile(oldImageId.toString(), session);
        }
        await article.save({ session });
        return article._id.toString();
      });
      if (!updatedArticleId) throw new NotFoundException('Не удалось обновить статью');
      return this.getArticleDetail(authedAdmin, updatedArticleId);

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
      console.error('Ошибка при обновлении статьи:', error);
      throw new InternalServerErrorException('Не удалось обновить статью');
    } finally {
      session.endSession();
    }
  }


  // Получение детальной информации о статье (для админов)
  async getArticleDetail(authedAdmin: AuthenticatedUser, articleId: string): Promise<ArticleFullResponseDto> {
    checkId([articleId]);

    const article = await this.articleModel.findById(new Types.ObjectId(articleId)).lean({ virtuals: true }).exec();
    if (!article) throw new NotFoundException('Статья не найдена');
    
    return plainToInstance(ArticleFullResponseDto, article, {excludeExtraneousValues: true});
  }


  // Получение списка всех статей (для админов)
  async getAllArticles(
    authedAdmin: AuthenticatedUser,
    articlesQuery: ArticleQueryDto
  ): Promise<ArticlePreviewResponseDto[]> {
    const filter: any = {};
    if (articlesQuery.targetAudience) filter.targetAudience = articlesQuery.targetAudience;
    const articles = await this.articleModel.find(filter).sort({ createdAt: -1 }).lean({ virtuals: true }).exec();
      
    return plainToInstance(ArticlePreviewResponseDto, articles, {excludeExtraneousValues: true});
  }


  // Архивирование статьи (для админов)
  async archiveArticle(authedAdmin: AuthenticatedUser, articleId: string): Promise<ArticleFullResponseDto> {
    checkId([articleId]);
    
    const article = await this.articleModel.findById(new Types.ObjectId(articleId)).lean({ virtuals: true }).exec();
    if (!article) throw new NotFoundException('Статья не найдена');
    
    article.status = ArticleStatus.ARCHIVED;
    const updatedArticle = await article.save();
    
    return plainToInstance(ArticleFullResponseDto, updatedArticle, {excludeExtraneousValues: true});
  }
}
