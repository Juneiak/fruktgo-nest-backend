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


// Административный контроллер для блога (требует авторизации)
@ApiTags('for admin')
@ApiBearerAuth('JWT-auth')
@Controller('articles')
@UseGuards(JwtAuthGuard, TypeGuard)
@UserType('admin')
export class AdminArticlesController {
  constructor(private readonly adminArticlesRoleService: AdminArticlesRoleService) {}

  @ApiOperation({ summary: 'Получить список всех статей' })
  @Get()
  getArticles(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Query() articlesQuery: ArticleQueryDto
  ): Promise<ArticlePreviewResponseDto[]> {
    return this.adminArticlesRoleService.getArticles(authedAdmin, articlesQuery);
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
  

  @ApiOperation({ summary: 'изменить статус статьи' })
  @Delete(':articleId')
  changeArticleStatus(
    @GetUser() authedAdmin: AuthenticatedUser,
    @Param('articleId') articleId: string,
    @Body() dto: ChangeArticleStatusDto
  ): Promise<ArticleFullResponseDto> {
    return this.adminArticlesRoleService.changeArticleStatus(authedAdmin, articleId, dto);
  }
}