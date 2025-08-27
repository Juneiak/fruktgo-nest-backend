import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export enum RefundStatus {
  CREATED = 'created',          // Создан
  PROCESSING = 'processing',    // В обработке
  COMPLETED = 'completed',      // Завершен
  FAILED = 'failed',            // Ошибка
  CANCELED = 'canceled',        // Отменен
}

export enum RefundReason {
  CUSTOMER_REQUEST = 'customer_request',   // По запросу клиента
  PRODUCT_QUALITY = 'product_quality',     // Проблема с качеством товара
  DELIVERY_ISSUE = 'delivery_issue',       // Проблема с доставкой
  ORDER_MISTAKE = 'order_mistake',         // Ошибка в заказе
  OUT_OF_STOCK = 'out_of_stock',           // Товар закончился
  OTHER = 'other',                          // Другое
}

@Schema({timestamps: true})
export class Refund extends Document {
  _id: Types.ObjectId;
  id: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'ShopAccount' })
  shopAccount: Types.ObjectId;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: 'Order' })
  order: Types.ObjectId;

  @Prop({ required: true, type: SchemaTypes.Number })
  amount: number;

  @Prop({ type: SchemaTypes.String, enum: Object.values(RefundReason), required: true })
  reason: RefundReason;

  @Prop({ type: SchemaTypes.String })
  description: string;
  
  @Prop({ type: SchemaTypes.ObjectId, ref: 'SettlementPeriod' })
  settlementPeriod: Types.ObjectId;

  @Prop({ type: SchemaTypes.String, enum: Object.values(RefundStatus), default: RefundStatus.CREATED })
  status: RefundStatus;

  // Ссылки на связанные сущности
  @Prop({ type: Object, default: {} })
  references: {
    transactionId?: string;     // ID транзакции после обработки
    paymentId?: string;         // ID платежа клиенту
  };

  // Кто инициировал возврат
  @Prop({ type: SchemaTypes.Mixed })
  initiatedBy: {
    type: string; // 'customer', 'seller', 'admin'
    id: Types.ObjectId;
  };
}

export const RefundSchema = SchemaFactory.createForClass(Refund);
