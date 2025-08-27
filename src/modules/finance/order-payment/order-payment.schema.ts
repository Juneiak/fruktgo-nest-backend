import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, SchemaTypes, Types } from "mongoose";

// Статусы платежа в нашей системе
export enum OrderPaymentStatus {
  PENDING = "pending",         // Ожидает оплаты
  WAITING_FOR_CAPTURE = "waiting_for_capture", // Платеж авторизован, ожидает подтверждения
  SUCCEEDED = "succeeded",     // Платеж успешно завершен
  CANCELED = "canceled",       // Платеж отменен
  REFUNDED = "refunded",       // Произведен возврат
  PARTIALLY_REFUNDED = "partially_refunded", // Произведен частичный возврат
}

// Статусы оплаты в ЮKassa
export enum YooKassaPaymentStatus {
  PENDING = "pending",         // Платеж создан, ожидает оплаты
  WAITING_FOR_CAPTURE = "waiting_for_capture", // Платеж авторизован, деньги блокированы
  SUCCEEDED = "succeeded",     // Платеж успешно завершен
  CANCELED = "canceled",       // Платеж отменен
}

// Методы оплаты в ЮKassa
export enum YooKassaPaymentMethod {
  BANK_CARD = "bank_card",     // Банковская карта
  YOO_MONEY = "yoo_money",     // ЮMoney
  SBP = "sbp",                 // Система быстрых платежей
  CASH = "cash",               // Наличные
  QIWI = "qiwi",               // QIWI
  MOBILE_BALANCE = "mobile_balance", // Счет мобильного телефона
  OTHER = "other",             // Другое
}

@Schema({timestamps: true})
export class OrderPayment extends Document {
  _id: Types.ObjectId;
  id: string;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: "ShopAccount" })
  shopAccount: Types.ObjectId;

  @Prop({ required: true, type: SchemaTypes.ObjectId, ref: "Order" })
  order: Types.ObjectId;

  @Prop({ required: true, type: SchemaTypes.Number })
  amount: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: "SettlementPeriod" })
  settlementPeriod: Types.ObjectId;

  @Prop({ type: SchemaTypes.String, enum: Object.values(OrderPaymentStatus), default: OrderPaymentStatus.PENDING })
  status: OrderPaymentStatus;

  // Сумма возвратов (если были)
  @Prop({ type: SchemaTypes.Number, default: 0 })
  refundedAmount: number;

  // Информация о платеже в ЮKassa
  @Prop({ type: Object, required: true })
  yookassa: {
    paymentId: string;          // ID платежа в ЮKassa
    status: string;             // Статус платежа в ЮKassa
    paymentMethod: string;      // Метод оплаты
    paid: boolean;              // Флаг оплаты
    capturedAt?: Date;          // Дата подтверждения платежа
    expiresAt?: Date;           // Срок истечения платежа
    refundedAmount?: number;    // Сумма возврата, если был возврат
    receiptId?: string;         // ID чека
    metadata?: any;             // Дополнительные данные платежа
  };

  // Ссылки на связанные сущности
  @Prop({ type: Object, default: {} })
  references: {
    transactionIds?: string[];   // ID транзакций
    refundIds?: string[];        // ID возвратов
  };
}

export const OrderPaymentSchema = SchemaFactory.createForClass(OrderPayment);
