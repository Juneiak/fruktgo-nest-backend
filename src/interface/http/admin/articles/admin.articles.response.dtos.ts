import { Expose, Type } from 'class-transformer';
import { ArticleEnums } from 'src/modules/article';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

export class ArticleFullResponseDto {
  @Expose() articleId: string;
  @Expose() title: string;
  @Expose() content: string;
  @ExposeObjectId() articleImage?: string | null;
  @Expose() @Type(() => String) targetAudience: ArticleEnums.ArticleTargetAudience;
  @Expose() @Type(() => String) status: ArticleEnums.ArticleStatus;
  @Expose() tags: ArticleEnums.ArtcilesTag[];
  @Expose() viewCount: number;
  @Expose() createdAt: Date;
  @Expose() @Type(() => Date) publishedAt?: Date;
  @ExposeObjectId() author: string;
  @Expose() @Type(() => String) authorType: ArticleEnums.ArticleAuthorType;
}


export class ArticlePreviewResponseDto {
  @Expose() articleId: string;
  @Expose() title: string;
  @ExposeObjectId() articleImage?: string | null;
  @Expose() contentPreview?: string;
  @Expose() tags: ArticleEnums.ArtcilesTag[];
  @Expose() createdAt: Date;
  @Expose() @Type(() => Date) publishedAt?: Date;
}