import { Types, ClientSession } from 'mongoose';
import { ArticleStatus, ArticleTargetAudience, ArtcilesTag } from './article.enums';

/**
 * Создать статью
 */
export class CreateArticleCommand {
  constructor(
    public readonly title: string,
    public readonly content: string,
    public readonly targetAudience: ArticleTargetAudience,
    public readonly tags: ArtcilesTag[],
    public readonly articleImageFile?: Express.Multer.File,
  ) {}
}

/**
 * Обновить статью
 */
export class UpdateArticleCommand {
  constructor(
    public readonly articleId: string,
    public readonly title?: string,
    public readonly content?: string,
    public readonly targetAudience?: ArticleTargetAudience,
    public readonly tags?: ArtcilesTag[],
    public readonly status?: ArticleStatus,
    public readonly articleImageFile?: Express.Multer.File | null,
  ) {}
}

/**
 * Изменить статус статьи
 */
export class ChangeArticleStatusCommand {
  constructor(
    public readonly articleId: string,
    public readonly status: ArticleStatus,
  ) {}
}
