/**
 * Public Article Response DTOs
 *
 * Используем PickType от BaseArticleResponseDto для выбора полей.
 * @see src/interface/http/shared/base-responses/article.base-response
 */

import { PickType } from '@nestjs/swagger';
import { BaseArticleResponseDto } from 'src/interface/http/shared/base-responses';

/**
 * Full — без author, authorType, status (публичные данные)
 */
export class ArticleFullResponseDto extends PickType(BaseArticleResponseDto, [
  'articleId',
  'title',
  'content',
  'articleImage',
  'targetAudience',
  'tags',
  'viewCount',
  'createdAt',
  'publishedAt',
] as const) {}

/**
 * Preview — для списков
 */
export class ArticlePreviewResponseDto extends PickType(BaseArticleResponseDto, [
  'articleId',
  'title',
  'articleImage',
  'contentPreview',
  'tags',
  'createdAt',
  'publishedAt',
] as const) {}