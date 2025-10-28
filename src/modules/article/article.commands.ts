import { Types, ClientSession } from 'mongoose';
import { ArticleStatus, ArticleTargetAudience, ArtcilesTag } from './article.enums';


export class CreateArticleCommand {
  constructor(
    public readonly payload: {
      title: string,
      content: string,
      targetAudience: ArticleTargetAudience,
      tags: ArtcilesTag[],
      articleImageFile?: Express.Multer.File,
    },
    public readonly articleId?: string,
  ) {}
}


export class UpdateArticleCommand {
  constructor(
    public readonly articleId: string,
    public readonly payload: {
      title?: string,
      content?: string,
      targetAudience?: ArticleTargetAudience,
      tags?: ArtcilesTag[],
      status?: ArticleStatus,
      articleImageFile?: Express.Multer.File | null,
    },
  ) {}
}


export class ChangeArticleStatusCommand {
  constructor(
    public readonly articleId: string,
    public readonly payload: {
      status: ArticleStatus,
    },
  ) {}
}
