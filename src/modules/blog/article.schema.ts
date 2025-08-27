import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';

// Тип автора статьи
export enum ArticleAuthorType {
  ADMIN = 'Admin',  // Статья от администратора
}

// Статус статьи
export enum ArticleStatus {
  PUBLISHED = 'published', // Опубликована
  ARCHIVED = 'archived'  // Архивная
}

// Целевая аудитория статьи
export enum ArticleTargetAudience {
  ALL = 'all',         // Для всех пользователей
  SELLERS = 'sellers', // Только для продавцов
  EMPLOYEES = 'employees', // Только для сотрудников
  CUSTOMERS = 'customers'  // Только для клиентов
}

export enum ArtcilesTag {
  SEASONAL = 'seasonal',           // Сезонные фрукты и овощи
  RECIPES = 'recipes',             // Рецепты и кулинария
  HEALTH = 'health',               // Польза для здоровья
  TIPS = 'tips',                   // Советы по выбору и хранению
  DELIVERY = 'delivery',           // О доставке
  PROMO = 'promo',                 // Акции и специальные предложения
  NEWS = 'news',                   // Новости маркетплейса
  SELLER_GUIDE = 'seller_guide',   // Руководство для продавцов
  CUSTOMER_GUIDE = 'customer_guide', // Руководство для покупателей
  FRUITS = 'fruits',               // О фруктах
  VEGETABLES = 'vegetables',       // Об овощах
  EXOTIC = 'exotic'                // Экзотические продукты
}

@Schema({
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false,
})
export class Article extends Document {

  _id: Types.ObjectId;
  articleId: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ required: true, type: String, enum: ArticleAuthorType })
  authorType: ArticleAuthorType;

  @Prop({
    type: Types.ObjectId,
    required: false,
    refPath: 'authorType' // динамическая ссылка на автора
  })
  author?: Types.ObjectId;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ type: String, required: false })
  contentPreview?: string;

  @Prop({ type: [String], enum: ArtcilesTag, default: [] })
  tags: ArtcilesTag[];

  @Prop({ type: String, required: true, enum: ArticleStatus, default: ArticleStatus.PUBLISHED })
  status: ArticleStatus;

  @Prop({ type: String, required: true, enum: ArticleTargetAudience, default: ArticleTargetAudience.ALL })
  targetAudience: ArticleTargetAudience;

  @Prop({ type: Types.ObjectId, ref: 'UploadedFile', required: false })
  articleImage?: Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  viewCount: number;

  @Prop({ type: Date, default: null })
  publishedAt: Date;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);
ArticleSchema.plugin(mongooseLeanVirtuals as any);

ArticleSchema.virtual('articleId').get(function (this: Article): string {
  return this._id.toString();
});