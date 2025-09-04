import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserType } from 'src/common/decorators/type.decorator';
import { BlogPublicService } from './blog.public.service';
import { ArticleTargetAudience } from '../article.schema';
import {
  ArticleFullResponseDto,
  ArticlePreviewResponseDto,
} from './blog.public.response.dto';

// Публичный контроллер блога (без авторизации)
@ApiTags('for public')
@Controller('public/blog')
@UserType('public')
export class BlogPublicController {
  constructor(private readonly blogPublicService: BlogPublicService) {}

  @ApiOperation({ summary: 'Получить опубликованную статью' })
  @Get('/articles/:articleId')
  async getArticle(@Param('articleId') articleId: string): Promise<ArticleFullResponseDto> {
    return this.blogPublicService.getPublishedArticle(articleId);
  }


  @ApiOperation({ summary: 'Получить список опубликованных статей' })
  @Get('/articles')
  async getPublishedArticles(
    @Query('targetAudience') targetAudience?: ArticleTargetAudience
  ): Promise<ArticlePreviewResponseDto[]> {
    return this.blogPublicService.getPublishedArticles(targetAudience);
  }
}
