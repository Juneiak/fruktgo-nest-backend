import { Expose, Type } from 'class-transformer';
import { ArticleStatus, ArticleTargetAudience } from '../../article.schema';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

export class ArticleFullResponseDto {
  @Expose() articleId: string;
  @Expose() title: string;
  @Expose() content: string;
  @ExposeObjectId() articleImage: string | null;
  @Expose() @Type(() => String) targetAudience: ArticleTargetAudience;
  @Expose() @Type(() => String) status: ArticleStatus;
  @Expose() viewCount: number;
  @Expose() createdAt: Date;
  @Expose() @Type(() => Date) publishedAt?: Date;
  @Expose() @Type(() => String) author: string;
  @Expose() @Type(() => String) authorType: string;
}


export class ArticlePreviewResponseDto {
  @Expose() articleId: string;
  @Expose() title: string;
  @ExposeObjectId() articleImage: string | null;
  @Expose() contentPreview: string;
  @Expose() createdAt: Date;
}