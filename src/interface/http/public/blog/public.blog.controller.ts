import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserType } from 'src/common/decorators/type.decorator';
import { ArticleTargetAudience } from 'src/modules/blog/article.schema';
import {
  ArticleFullResponseDto,
  ArticlePreviewResponseDto,
} from './public.blog.response.dtos';
import { PublicBlogRoleService } from './public.blog.role.service'

// Публичный контроллер блога (без авторизации)
@ApiTags('for public')
@Controller()
@UserType('public')
export class PublicBlogController {
  constructor(private readonly publicBlogRoleService: PublicBlogRoleService) {}

  @ApiOperation({ summary: 'Получить опубликованную статью' })
  @Get('articles/:articleId')
  async getArticle(@Param('articleId') articleId: string): Promise<ArticleFullResponseDto> {
    return this.publicBlogRoleService.getPublishedArticle(articleId);
  }


  @ApiOperation({ summary: 'Получить список опубликованных статей' })
  @Get('articles')
  async getPublishedArticles(
    @Query('targetAudience') targetAudience?: ArticleTargetAudience
  ): Promise<ArticlePreviewResponseDto[]> {
    return this.publicBlogRoleService.getPublishedArticles(targetAudience);
  }
}
