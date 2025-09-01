import { Controller, Delete, UseInterceptors, Post, Patch, Body, Get, Param, UseGuards, Query, UploadedFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { BlogAdminService } from './blog.admin.service';
import { ArticleTargetAudience } from '../article.schema';
import {
  CreateArticleDto,
  UpdateArticleDto,
} from './blog.admin.request.dto';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import {
  ArticleFullResponseDto,
  ArticlePreviewResponseDto,
} from './blog.admin.response.dto';

// Административный контроллер для блога (требует авторизации)
@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('blog/for-admin')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class BlogAdminController {
  constructor(private readonly blogAdminService: BlogAdminService) {}

  @ApiOperation({ summary: 'Создать новую статью' })
  @Post('/articles')
  @UseInterceptors(ImageUploadInterceptor('articleImage'))
  createArticle(
    @Body() dto: CreateArticleDto,
    @GetUser() authedAdmin: AuthenticatedUser,
    @UploadedFile() articleImage?: Express.Multer.File
  ): Promise<ArticleFullResponseDto> {
    return this.blogAdminService.createArticle(authedAdmin, dto, articleImage);
  }

  @ApiOperation({ summary: 'Обновить существующую статью' })
  @Patch('/articles/:articleId')
  @UseInterceptors(ImageUploadInterceptor('articleImage'))
  updateArticle(
    @Body() dto: UpdateArticleDto,
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('articleId') articleId: string,
    @UploadedFile() articleImage?: Express.Multer.File
  ): Promise<ArticleFullResponseDto> {
    return this.blogAdminService.updateArticle(authedAdmin, articleId, dto, articleImage);
  }
  

  @ApiOperation({ summary: 'Получить полную информацию о статье' })
  @Get('/articles/:articleId')
  getArticleDetail(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('articleId') articleId: string
  ): Promise<ArticleFullResponseDto> {
    return this.blogAdminService.getArticleDetail(authedAdmin, articleId);
  }

  @ApiOperation({ summary: 'Получить список всех статей' })
  @Get('/articles')
  getAllArticles(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query('targetAudience') targetAudience?: ArticleTargetAudience
  ): Promise<ArticlePreviewResponseDto[]> {
    return this.blogAdminService.getAllArticles(authedAdmin, targetAudience);
  }

  @ApiOperation({ summary: 'Архивировать статью' })
  @Delete('/articles/:articleId')
  archiveArticle(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('articleId') articleId: string
  ): Promise<ArticleFullResponseDto> {
    return this.blogAdminService.archiveArticle(authedAdmin, articleId);
  }
}