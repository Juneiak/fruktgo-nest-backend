import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Article, ArticleStatus, ArticleTargetAudience } from '../article.schema';
import { 
  ArticleFullResponseDto, 
  ArticlePreviewResponseDto,
} from './blog.public.response.dto';
import { plainToInstance } from 'class-transformer';
import { checkId } from "src/common/utils";

@Injectable()
export class BlogPublicService {
  constructor(
    @InjectModel('Article') private articleModel: Model<Article>,
  ) {}

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
    if (targetAudience) filter.targetAudience = targetAudience;
    
    const articles = await this.articleModel.find(filter).sort({ publishedAt: -1 }).lean({ virtuals: true }).exec();
      
    return plainToInstance(ArticlePreviewResponseDto, articles, {excludeExtraneousValues: true});
  }
}
