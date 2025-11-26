import { Controller, Delete, UseInterceptors, Post, Patch, Body, Get, Param, UseGuards, Query, UploadedFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TypeGuard } from 'src/common/guards/type.guard';
import { UserType } from 'src/common/decorators/type.decorator';
import { GetUser } from 'src/common/decorators/user.decorator';
import { AuthenticatedUser } from 'src/common/types';
import { AdminArticlesRoleService } from './admin.articles.role.service'
import {
  ChangeArticleStatusDto,
  CreateArticleDto,
  UpdateArticleDto,
} from './admin.articles.request.dtos';
import { ImageUploadInterceptor } from 'src/common/interceptors/image-upload.interceptor';
import {
  ArticleFullResponseDto,
  ArticlePreviewResponseDto,
} from './admin.articles.response.dtos';
import { ArticleQueryDto } from './admin.articles.query.dtos';
import { PaginationQueryDto } from 'src/interface/http/responses/common.query.dtos';
import { PaginatedResponseDto } from 'src/interface/http/shared';


// Административный контроллер для блога (требует авторизации)
@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('articles')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminArticlesController {
  constructor(private readonly adminArticlesRoleService: AdminArticlesRoleService) {}

  @ApiOperation({ summary: 'Получить список статей' })
  @Get()
  getArticles(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() articlesQuery: ArticleQueryDto,
    @Query() paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ArticlePreviewResponseDto>> {
    return this.adminArticlesRoleService.getArticles(authedAdmin, articlesQuery, paginationQuery);
  }

  
  @ApiOperation({ summary: 'Получить полную информацию о статье' })
  @Get(':articleId')
  getArticle(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('articleId') articleId: string
  ): Promise<ArticleFullResponseDto> {
    return this.adminArticlesRoleService.getArticle(authedAdmin, articleId);
  }


  @ApiOperation({ summary: 'Создать новую статью' })
  @Post()
  @UseInterceptors(ImageUploadInterceptor('articleImage'))
  createArticle(
    @Body() dto: CreateArticleDto,
    @GetUser() authedAdmin: AuthenticatedUser,
    @UploadedFile() articleImage?: Express.Multer.File
  ): Promise<ArticleFullResponseDto> {
    return this.adminArticlesRoleService.createArticle(authedAdmin, dto, articleImage);
  }


  @ApiOperation({ summary: 'Обновить статью' })
  @Patch(':articleId')
  @UseInterceptors(ImageUploadInterceptor('articleImage'))
  updateArticle(
    @Body() dto: UpdateArticleDto,
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('articleId') articleId: string,
    @UploadedFile() articleImage?: Express.Multer.File
  ): Promise<ArticleFullResponseDto> {
    return this.adminArticlesRoleService.updateArticle(authedAdmin, articleId, dto, articleImage);
  }
  

  @ApiOperation({ summary: 'Изменить статус статьи' })
  @Patch(':articleId/status')
  changeArticleStatus(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('articleId') articleId: string,
    @Body() dto: ChangeArticleStatusDto
  ): Promise<ArticleFullResponseDto> {
    return this.adminArticlesRoleService.changeArticleStatus(authedAdmin, articleId, dto);
  }


  @ApiOperation({ summary: 'Удалить статью' })
  @Delete(':articleId')
  deleteArticle(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('articleId') articleId: string,
  ): Promise<void> {
    return this.adminArticlesRoleService.deleteArticle(authedAdmin, articleId);
  }
}