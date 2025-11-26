/**
 * Article Response Schema & Base DTO
 *
 * Базовый интерфейс привязан к DB Schema.
 * Базовый DTO содержит все поля с декораторами.
 * Роль-специфичные DTOs делают PickType(BaseArticleResponseDto, [...])
 *
 * @example
 * export class ArticleResponseDto extends PickType(BaseArticleResponseDto, [
 *   'articleId', 'title', 'content'
 * ]) {}
 */

import { Expose, Type } from 'class-transformer';
import { Article, ArticleEnums } from 'src/modules/article';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

// ═══════════════════════════════════════════════════════════════
// INTERFACES (type-safe привязка к схеме)
// ═══════════════════════════════════════════════════════════════

export interface IArticleResponse {
  articleId: string;
  title: Article['title'];
  content: Article['content'];
  contentPreview?: Article['contentPreview'];
  articleImage?: string | null;
  tags: Article['tags'];
  targetAudience: Article['targetAudience'];
  status: Article['status'];
  viewCount: Article['viewCount'];
  createdAt: Date;
  publishedAt?: Date;
  author: string;
  authorType: Article['authorType'];
}

// ═══════════════════════════════════════════════════════════════
// BASE DTOs (с декораторами, для наследования)
// ═══════════════════════════════════════════════════════════════

export class BaseArticleResponseDto implements IArticleResponse {
  @Expose() articleId: string;
  @Expose() title: string;
  @Expose() content: string;
  @Expose() contentPreview?: string;
  @ExposeObjectId() articleImage?: string | null;
  @Expose() tags: ArticleEnums.ArtcilesTag[];
  @Expose() targetAudience: ArticleEnums.ArticleTargetAudience;
  @Expose() status: ArticleEnums.ArticleStatus;
  @Expose() viewCount: number;
  @Expose() createdAt: Date;
  @Expose() @Type(() => Date) publishedAt?: Date;
  @ExposeObjectId() author: string;
  @Expose() authorType: ArticleEnums.ArticleAuthorType;
}
