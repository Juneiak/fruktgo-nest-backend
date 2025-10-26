import { ArticleAuthorType, ArticleStatus, ArticleTargetAudience, ArtcilesTag } from "./article.enums";

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
    }
  ) {}
}