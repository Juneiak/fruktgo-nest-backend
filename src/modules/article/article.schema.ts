import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, PaginateModel, Types } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import * as mongoosePaginate from 'mongoose-paginate-v2';
import { ArticleAuthorType, ArticleStatus, ArticleTargetAudience, ArtcilesTag } from './article.enums';
import { Image } from 'src/infra/images/image.schema';

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
  versionKey: false,
})
export class Article {
  _id: Types.ObjectId;
  articleId: string;
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ required: true, type: String, enum: ArticleAuthorType })
  authorType: ArticleAuthorType;

  @Prop({ type: Types.ObjectId, refPath: 'authorType' })
  author?: Types.ObjectId;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String })
  contentPreview?: string;

  @Prop({ type: [String], enum: ArtcilesTag, default: () => [] })
  tags: ArtcilesTag[];

  @Prop({ type: String, enum: ArticleStatus, required: true, default: ArticleStatus.DRAFT })
  status: ArticleStatus;

  @Prop({ type: String, enum: ArticleTargetAudience, required: true, default: ArticleTargetAudience.ALL })
  targetAudience: ArticleTargetAudience;

  @Prop({ type: Types.ObjectId, ref: Image.name })
  articleImage?: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  viewCount: number;

  @Prop({ type: Date })
  publishedAt?: Date;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);
ArticleSchema.plugin(mongoosePaginate);
ArticleSchema.plugin(mongooseLeanVirtuals);

// Виртуальное поле articleId
ArticleSchema.virtual('articleId').get(function() {
  return this._id?.toString() || '';
});


export type ArticleModel = PaginateModel<Article>;
export type ArticleDocument = HydratedDocument<Article>;