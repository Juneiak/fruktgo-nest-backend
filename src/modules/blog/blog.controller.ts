import { Controller, Delete, UseInterceptors, Post, Patch, Body, Get, Param, UseGuards, Query, NotFoundException, UploadedFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { BlogService } from './blog.service';
import { ArticleTargetAudience } from './article.schema';
import {
  ArticleFullResponseDto,
  ArticlePreviewResponseDto,
  CreateArticleDto,
  UpdateArticleDto,
  CreateArticleFormDataDto,
  UpdateArticleFormDataDto
} from './blog.dtos';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import { ApiFormData } from 'src/common/swagger/api-form-data.decorator';

// Административный контроллер для блога (требует авторизации)
@ApiTags('for admin')
// @ApiBearerAuth('JWT-auth')
@Controller('blog/for-admin')
// @UseGuards(JwtAuthGuard, TypeGuard)
// @UserType('admin')
export class BlogAdminController {
  constructor(private readonly blogService: BlogService) {}

  
  @ApiOperation({ summary: 'Создать новую статью' })
  @ApiFormData('articleImage', true, CreateArticleFormDataDto)
  @ApiOkResponse({ type: ArticleFullResponseDto })
  @Post('/articles')
  @UseInterceptors(ImageUploadInterceptor('articleImage'))
  createArticle(
    @Body() dto: CreateArticleDto,
    @GetUser() authedAdmin: AuthenticatedUser,
    @UploadedFile() articleImage?: Express.Multer.File
  ): Promise<ArticleFullResponseDto> {
    return this.blogService.createArticle(authedAdmin, dto, articleImage);
  }

  @ApiOperation({ summary: 'Обновить существующую статью' })
  @ApiFormData('articleImage', true, UpdateArticleFormDataDto)
  @ApiOkResponse({ type: ArticleFullResponseDto })
  @Patch('/articles/:articleId')
  @UseInterceptors(ImageUploadInterceptor('articleImage'))
  updateArticle(
    @Body() dto: UpdateArticleDto,
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('articleId') articleId: string,
    @UploadedFile() articleImage?: Express.Multer.File
  ): Promise<ArticleFullResponseDto> {
    return this.blogService.updateArticle(authedAdmin, articleId, dto, articleImage);
  }
  

  @ApiOperation({ summary: 'Получить полную информацию о статье' })
  @ApiOkResponse({ type: ArticleFullResponseDto })
  @Get('/articles/:articleId')
  getArticleDetail(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('articleId') articleId: string
  ): Promise<ArticleFullResponseDto> {
    return this.blogService.getArticleDetail(authedAdmin, articleId);
  }

  @ApiOperation({ summary: 'Получить список всех статей' })
  @ApiOkResponse({ type: ArticlePreviewResponseDto, isArray: true })
  @ApiQuery({ name: 'targetAudience', required: false, enum: ArticleTargetAudience })
  @Get('/articles')
  getAllArticles(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query('targetAudience') targetAudience?: ArticleTargetAudience
  ): Promise<ArticlePreviewResponseDto[]> {
    return this.blogService.getAllArticles(authedAdmin, targetAudience);
  }

  @ApiOperation({ summary: 'Архивировать статью' })
  @ApiOkResponse({ type: ArticleFullResponseDto })
  @Delete('/articles/:articleId')
  archiveArticle(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('articleId') articleId: string
  ): Promise<ArticleFullResponseDto> {
    return this.blogService.archiveArticle(authedAdmin, articleId);
  }
}

// Публичный контроллер блога (без авторизации)
@ApiTags('for public')
@Controller('blog/for-public')
@UserType('public')
export class BlogPublicController {
  constructor(private readonly blogService: BlogService) {}

  @ApiOperation({ summary: 'Получить опубликованную статью' })
  @ApiOkResponse({ type: ArticleFullResponseDto })
  @Get('/articles/:articleId')
  async getArticle(@Param('articleId') articleId: string): Promise<ArticleFullResponseDto> {
    return this.blogService.getPublishedArticle(articleId);
  }

  @ApiOperation({ summary: 'Получить список опубликованных статей' })
  @ApiOkResponse({ type: ArticlePreviewResponseDto, isArray: true })
  @ApiQuery({ name: 'targetAudience', required: false, enum: ArticleTargetAudience })
  @Get('/articles')
  async getPublishedArticles(
    @Query('targetAudience') targetAudience?: ArticleTargetAudience
  ): Promise<ArticlePreviewResponseDto[]> {
    return this.blogService.getPublishedArticles(targetAudience);
  }
}
