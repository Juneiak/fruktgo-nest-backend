import { Injectable, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Article, ArticleStatus, ArticleTargetAudience, ArticleAuthorType } from './article.schema';
import { 
  ArticleFullResponseDto, 
  ArticlePreviewResponseDto,
  CreateArticleDto,
  UpdateArticleDto 
} from './blog.dtos';
import { plainToInstance } from 'class-transformer';
import { checkId } from "src/common/utils";
import { AuthenticatedUser, UserType } from "src/common/types";
import { UploadsService } from "src/common/modules/uploads/uploads.service";
import { EntityType, ImageType } from "src/common/modules/uploads/uploaded-file.schema";

@Injectable()
export class BlogService {
  constructor(
    @InjectModel('Article') private articleModel: Model<Article>,
    private readonly uploadsService: UploadsService
  ) {}

  // Создание статьи (только для админов)
  async createArticle(authedAdmin: AuthenticatedUser, dto: CreateArticleDto, articleImage?: Express.Multer.File): Promise<ArticleFullResponseDto> {
    
    // Получаем сессию из соединения с MongoDB для транзакций
    const session = await this.articleModel.db.startSession();
    
    try {
      // Начинаем транзакцию
      session.startTransaction();
      
      // Создаем статью внутри транзакции
      const article = await this.articleModel.create([{
        title: dto.title,
        content: dto.content,
        contentPreview: dto.content.slice(0, 200),
        // tags: dto.tags || [],
        targetAudience: dto.targetAudience,
        authorType: ArticleAuthorType.ADMIN,
        // author: new Types.ObjectId(authedAdmin.id),
        status: ArticleStatus.PUBLISHED,
        publishedAt: new Date()
      }], { session }).then(docs => docs[0]);
      
      if (!article) throw new NotFoundException('Не удалось создать статью');
      
      // Если есть изображение, загружаем его в рамках транзакции
      if (articleImage) {
        const createdImage = await this.uploadsService.uploadImage({
          file: articleImage,
          accessLevel: 'public',
          entityType: EntityType.article,
          entityId: article._id.toString(),
          imageType: ImageType.articleImage,
          // allowedUsers: [{ userId: authedAdmin.id, role: UserType.ADMIN }],
          session // Передаем сессию в метод uploadImage
        });
        
        // Обновляем статью в рамках транзакции
        await this.articleModel.findByIdAndUpdate(
          article._id,
          { articleImage: createdImage._id },
          { session, new: true }
        ).exec();
      }
      
      // Фиксируем изменения
      await session.commitTransaction();
      
      // Получаем обновленную статью (с изображением)
      const updatedArticle = await this.articleModel.findById(article._id).lean({ virtuals: true }).exec();
      return plainToInstance(ArticleFullResponseDto, updatedArticle, { excludeExtraneousValues: true });
      
    } catch (error) {
      // Отменяем все изменения при любой ошибке
      await session.abortTransaction();
      
      // Логируем ошибку и пробрасываем её дальше с понятным сообщением
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('Ошибка при создании статьи:', error);
      throw new InternalServerErrorException('Не удалось создать статью');
      
    } finally {
      // Завершаем сессию в любом случае
      session.endSession();
    }
  }

  // Обновление статьи (только для админов)
  async updateArticle(authedAdmin: AuthenticatedUser, articleId: string, dto: UpdateArticleDto, articleImage?: Express.Multer.File): Promise<ArticleFullResponseDto> {
    checkId([articleId]);
    
    // Получаем сессию из соединения с MongoDB для транзакций
    const session = await this.articleModel.db.startSession();
    
    try {
      // Начинаем транзакцию
      session.startTransaction();
      
      // Проверяем и находим статью в рамках транзакции
      const article = await this.articleModel.findById(new Types.ObjectId(articleId)).session(session).exec();
      if (!article) throw new NotFoundException('Статья не найдена');
      
      // Сохраняем старый ID изображения, если есть
      const oldImageId = article.articleImage || null;
      
      // Обновляем поля, если они предоставлены в DTO
      if (dto.title) article.title = dto.title;
      if (dto.content) {
        article.content = dto.content;
        article.contentPreview = dto.content.slice(0, 200);
      };
      // if (dto.tags) article.tags = dto.tags;
      if (dto.targetAudience) article.targetAudience = dto.targetAudience;
      if (dto.status) article.status = dto.status;
      
      // Если статус изменился на PUBLISHED, устанавливаем дату публикации
      if (dto.status === ArticleStatus.PUBLISHED && !article.publishedAt) {
        article.publishedAt = new Date();
      }
      
      // Если есть новое изображение, загружаем его в рамках транзакции
      if (articleImage) {
        const createdImage = await this.uploadsService.uploadImage({
          file: articleImage,
          accessLevel: 'public',
          entityType: EntityType.article,
          entityId: article._id.toString(),
          imageType: ImageType.articleImage,
          allowedUsers: [{ userId: authedAdmin.id, role: UserType.ADMIN }],
          session // Передаем сессию в метод uploadImage
        });
        
        // Устанавливаем новое изображение
        article.articleImage = createdImage._id;
      }
      
      // Сохраняем обновленную статью в рамках транзакции
      await article.save({ session });
      
      // Если загрузили новое изображение и есть старое - удаляем старое
      if (articleImage && oldImageId) {
        // Используем метод deleteFile с поддержкой сессий
        await this.uploadsService.deleteFile(oldImageId.toString(), session);
      }
      
      // Фиксируем изменения
      await session.commitTransaction();
      
      // Получаем обновленную статью
      const updatedArticle = await this.articleModel.findById(article._id).lean({ virtuals: true }).exec();
      return plainToInstance(ArticleFullResponseDto, updatedArticle, { excludeExtraneousValues: true });
      
    } catch (error) {
      // Отменяем все изменения при любой ошибке
      await session.abortTransaction();
      
      // Логируем ошибку и пробрасываем её дальше с понятным сообщением
      if (error instanceof NotFoundException || 
          error instanceof BadRequestException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('Ошибка при обновлении статьи:', error);
      throw new InternalServerErrorException('Не удалось обновить статью');
      
    } finally {
      // Завершаем сессию в любом случае
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
  async getAllArticles(authedAdmin: AuthenticatedUser, targetAudience?: ArticleTargetAudience): Promise<ArticlePreviewResponseDto[]> {
    const filter: any = {};
    if (targetAudience) {
      filter.targetAudience = targetAudience;
    }
    
    const articles = await this.articleModel.find(filter).sort({ createdAt: -1 }).lean({ virtuals: true }).exec();
      
    return plainToInstance(ArticlePreviewResponseDto, articles, {excludeExtraneousValues: true});
  }

  // Получение опубликованной статьи (для публики)
  async getPublishedArticle(articleId: string): Promise<ArticleFullResponseDto> {
    checkId([articleId]);
    
    const article = await this.articleModel.findOne({
      _id: new Types.ObjectId(articleId),
      status: ArticleStatus.PUBLISHED
    }).lean({ virtuals: true }).exec();
    
    if (!article) throw new NotFoundException('Статья не найдена');
    // Увеличиваем счетчик просмотров (отдельный запрос, не в транзакции)
    await this.articleModel.findByIdAndUpdate(
      article._id,
      { $inc: { viewCount: 1 } }
    ).exec();
    
    return plainToInstance(ArticleFullResponseDto, article, {excludeExtraneousValues: true});
  }

  // Получение списка опубликованных статей (для публики)
  async getPublishedArticles(targetAudience?: ArticleTargetAudience): Promise<ArticlePreviewResponseDto[]> {
    const filter: any = { status: ArticleStatus.PUBLISHED };
    if (targetAudience) {
      filter.targetAudience = targetAudience;
    }
    
    const articles = await this.articleModel.find(filter).sort({ publishedAt: -1 }).lean({ virtuals: true }).exec();
      
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
