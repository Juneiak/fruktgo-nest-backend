import { ArticleAuthorType, ArticleStatus, ArticleTargetAudience, ArtcilesTag } from "./article.enums";
import { Article } from "./article.schema";

/**
 * Получить одну статью по ID
 */
export class GetArticleQuery {
  constructor(
    public readonly articleId: string,
    public readonly options?: {
      select?: (keyof Article)[]
    }
  ) {}
}

/**
 * Получить список статей с фильтрами
 */
export class GetArticlesQuery {
  constructor(
    public readonly filters?: {
      statuses?: ArticleStatus[];
      authorType?: ArticleAuthorType;
      targetAudience?: ArticleTargetAudience;
      tags?: ArtcilesTag[];
      fromDate?: Date;
      toDate?: Date;
    },
    public readonly options?: {
      select?: (keyof Article)[]
    }
  ) {}
}