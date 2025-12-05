import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import {
  StorefrontStatus,
  StorefrontProductStatus,
  DiscountType,
  DiscountReason,
} from './storefront.enums';

/**
 * Активная скидка на товар
 */
@Schema({ _id: false })
export class ActiveDiscount {
  /** Тип скидки */
  @Prop({
    type: String,
    enum: Object.values(DiscountType),
    required: true,
  })
  type: DiscountType;

  /** Значение (сумма или процент) */
  @Prop({ type: Number, min: 0, required: true })
  value: number;

  /** Причина скидки */
  @Prop({
    type: String,
    enum: Object.values(DiscountReason),
    required: true,
  })
  reason: DiscountReason;

  /** Дата начала */
  @Prop({ type: Date })
  startDate?: Date;

  /** Дата окончания */
  @Prop({ type: Date })
  endDate?: Date;

  /** Описание */
  @Prop({ type: String })
  description?: string;

  /** Кто применил */
  @Prop({ type: Types.ObjectId })
  appliedBy?: Types.ObjectId;

  /** Когда применено */
  @Prop({ type: Date, default: Date.now })
  appliedAt: Date;
}
export const ActiveDiscountSchema = SchemaFactory.createForClass(ActiveDiscount);

/**
 * Ценообразование товара на витрине
 */
@Schema({ _id: false })
export class ProductPricing {
  /** Базовая цена онлайн */
  @Prop({ type: Number, min: 0, required: true })
  onlinePrice: number;

  /** Базовая цена офлайн */
  @Prop({ type: Number, min: 0, required: true })
  offlinePrice: number;

  /** Средняя закупочная цена (для расчёта маржи) */
  @Prop({ type: Number, min: 0 })
  purchasePrice?: number;

  /** Активные скидки */
  @Prop({ type: [ActiveDiscountSchema], default: () => [] })
  discounts: ActiveDiscount[];

  /** Финальная онлайн-цена (с учётом скидок) */
  @Prop({ type: Number, min: 0 })
  finalOnlinePrice?: number;

  /** Финальная офлайн-цена (НЕ меняется автоматически) */
  @Prop({ type: Number, min: 0 })
  finalOfflinePrice?: number;
}
export const ProductPricingSchema = SchemaFactory.createForClass(ProductPricing);

/**
 * Товар на витрине
 */
@Schema({ _id: true })
export class StorefrontProduct {
  _id: Types.ObjectId;

  /** Товар из справочника */
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  product: Types.ObjectId;

  /** Шаблон товара продавца */
  @Prop({ type: Types.ObjectId, ref: 'ProductTemplate', index: true })
  productTemplate?: Types.ObjectId;

  /** Название (денормализовано) */
  @Prop({ type: String, required: true })
  productName: string;

  /** Категория (денормализовано) */
  @Prop({ type: Types.ObjectId, ref: 'Category' })
  category?: Types.ObjectId;

  /** Статус */
  @Prop({
    type: String,
    enum: Object.values(StorefrontProductStatus),
    default: StorefrontProductStatus.ACTIVE,
    index: true,
  })
  status: StorefrontProductStatus;

  /** Ценообразование */
  @Prop({ type: ProductPricingSchema, required: true })
  pricing: ProductPricing;

  /** Текущий остаток (денормализовано из BatchLocation) */
  @Prop({ type: Number, min: 0, default: 0 })
  stockQuantity: number;

  /** Зарезервировано */
  @Prop({ type: Number, min: 0, default: 0 })
  reservedQuantity: number;

  /** Доступно для продажи */
  @Prop({ type: Number, min: 0, default: 0 })
  availableQuantity: number;

  /** Ближайшая дата истечения (денормализовано) */
  @Prop({ type: Date })
  nearestExpirationDate?: Date;

  /** Средняя свежесть (0-10) */
  @Prop({ type: Number, min: 0, max: 10 })
  averageFreshness?: number;

  /** Видимость для клиентов */
  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  /** Дата добавления на витрину */
  @Prop({ type: Date, default: Date.now })
  addedAt: Date;
}
export const StorefrontProductSchema =
  SchemaFactory.createForClass(StorefrontProduct);

/**
 * Storefront — витрина магазина
 *
 * Представляет каталог товаров магазина для клиентов:
 * - Список товаров с ценами
 * - Остатки и доступность
 * - Скидки и промо
 */
@Schema({
  timestamps: true,
  collection: 'inventory_storefronts',
})
export class Storefront {
  _id: Types.ObjectId;

  /** Продавец */
  @Prop({ type: Types.ObjectId, ref: 'Seller', required: true, index: true })
  seller: Types.ObjectId;

  /** Магазин (1:1) */
  @Prop({
    type: Types.ObjectId,
    ref: 'Shop',
    required: true,
    unique: true,
    index: true,
  })
  shop: Types.ObjectId;

  /** Название магазина (денормализовано) */
  @Prop({ type: String, required: true })
  shopName: string;

  /** Статус витрины */
  @Prop({
    type: String,
    enum: Object.values(StorefrontStatus),
    default: StorefrontStatus.ACTIVE,
    index: true,
  })
  status: StorefrontStatus;

  /** Товары на витрине */
  @Prop({ type: [StorefrontProductSchema], default: () => [] })
  products: StorefrontProduct[];

  /** Общее количество товаров */
  @Prop({ type: Number, min: 0, default: 0 })
  totalProducts: number;

  /** Количество активных товаров */
  @Prop({ type: Number, min: 0, default: 0 })
  activeProducts: number;

  createdAt: Date;
  updatedAt: Date;
}

export type StorefrontDocument = HydratedDocument<Storefront>;
export type StorefrontModel = Model<Storefront>;

export const StorefrontSchema = SchemaFactory.createForClass(Storefront);

// Индексы
StorefrontSchema.index({ 'products.product': 1 });
StorefrontSchema.index({ 'products.status': 1 });
StorefrontSchema.index({ 'products.category': 1 });
StorefrontSchema.index({ seller: 1, status: 1 });
