import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserType } from 'src/common/decorators/type.decorator';
import {
  ArticleFullResponseDto,
  ArticlePreviewResponseDto,
} from './public.aticles.response.dtos';
import { PublicArticlesRoleService } from './public.aticles.role.service';
import { PaginationQueryDto, PaginatedResponseDto } from 'src/common/dtos';
import { PublicArticlesQueryDto } from './public.aticles.query.dtos';

// Публичный контроллер блога (без авторизации)
@ApiTags('for public')
@Controller()
@UserType('public')
export class PublicArticlesController {
  constructor(private readonly publicArticlesRoleService: PublicArticlesRoleService) {}

  @ApiOperation({ summary: 'Получить опубликованную статью' })
  @Get('articles/:articleId')
  async getArticle(
    @Param('articleId') articleId: string
  ): Promise<ArticleFullResponseDto> {
    return this.publicArticlesRoleService.getPublishedArticle(articleId);
  }


  @ApiOperation({ summary: 'Получить список опубликованных статей' })
  @Get('articles')
  async getPublishedArticles(
    @Query() queryDto: PublicArticlesQueryDto,
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<ArticlePreviewResponseDto>> {
    return this.publicArticlesRoleService.getPublishedArticles(queryDto, paginationQuery);
  }
}
