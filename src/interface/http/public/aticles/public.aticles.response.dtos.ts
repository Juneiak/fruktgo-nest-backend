import { Expose, Type } from 'class-transformer';
import { 
  ArticleTargetAudience,
  ArtcilesTag 
} from 'src/modules/article/article.enums';
import { ExposeObjectId } from 'src/common/decorators/expose-object-id.decorator';

export class ArticleFullResponseDto {
  @Expose() articleId: string;
  @Expose() title: string;
  @Expose() content: string;
  @ExposeObjectId() articleImage?: string | null;
  @Expose() @Type(() => String) targetAudience: ArticleTargetAudience;
  @Expose() tags: ArtcilesTag[];
  @Expose() viewCount: number;
  @Expose() createdAt: Date;
  @Expose() @Type(() => Date) publishedAt?: Date;
}


export class ArticlePreviewResponseDto {
  @Expose() articleId: string;
  @Expose() title: string;
  @ExposeObjectId() articleImage?: string | null;
  @Expose() contentPreview?: string;
  @Expose() tags: ArtcilesTag[];
  @Expose() createdAt: Date;
  @Expose() @Type(() => Date) publishedAt?: Date;
}