import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { UserType } from "src/common/types";

export enum NotificationType {
  ORDER_STATUS_CHANGED = "order_status_changed",
  ORDER_CREATED = "order_created",
  ORDER_CANCELLED = "order_cancelled",
  PAYMENT_RECEIVED = "payment_received",
  PAYMENT_FAILED = "payment_failed",
  WITHDRAWAL_APPROVED = "withdrawal_approved",
  WITHDRAWAL_REJECTED = "withdrawal_rejected",
  ACCOUNT_VERIFIED = "account_verified",
  ACCOUNT_BLOCKED = "account_blocked",
  PENALTY_APPLIED = "penalty_applied",
  SHIFT_STARTED = "shift_started",
  SHIFT_ENDED = "shift_ended",
  PRODUCT_OUT_OF_STOCK = "product_out_of_stock",
  SHOP_STATUS_CHANGED = "shop_status_changed",
  SUPPORT_TICKET_UPDATED = "support_ticket_updated",
  SYSTEM_MAINTENANCE = "system_maintenance",
  PROMOTIONAL = "promotional",
  GENERAL = "general"
}

export enum NotificationStatus {
  UNREAD = "unread",
  READ = "read",
  ARCHIVED = "archived"
}

export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent"
}

@Schema({ 
  timestamps: true,
  collection: "notifications",
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false
})
export class Notification extends Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  @Prop({ 
    required: true, 
    enum: UserType,
    type: String
  })
  recipientType: UserType;

  @Prop({
    type: Types.ObjectId,
    required: true,
    refPath: 'recipientType'
  })
  recipientId: Types.ObjectId;

  @Prop({ 
    required: true, 
    enum: NotificationType,
    type: String
  })
  type: NotificationType;

  @Prop({ required: true, maxlength: 200 })
  title: string;

  @Prop({ required: true, maxlength: 1000 })
  message: string;

  @Prop({ 
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
    type: String
  })
  status: NotificationStatus;

  @Prop({ 
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
    type: String
  })
  priority: NotificationPriority;

  // Дополнительные данные для уведомления (например, ID заказа, ссылки и т.д.)
  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  // Ссылка для перехода при клике на уведомление
  @Prop({ type: String })
  actionUrl?: string;

  // Дата когда уведомление должно быть показано (для отложенных уведомлений)
  @Prop({ type: Date })
  scheduledFor?: Date;

  // Дата истечения уведомления
  @Prop({ type: Date })
  expiresAt?: Date;

  // Отправитель уведомления (система, админ и т.д.)
  @Prop({ 
    enum: UserType,
    type: String
  })
  senderType?: UserType;

  @Prop({ 
    type: Types.ObjectId,
    refPath: 'senderType'
  })
  senderId?: Types.ObjectId;

  // Дата прочтения
  @Prop({ type: Date })
  readAt?: Date;

  // Канал доставки уведомления
  @Prop({ 
    type: [String], 
    enum: ["push", "email", "sms", "telegram", "in_app"],
    default: ["in_app"]
  })
  channels: string[];

  // Статус доставки по каналам
  @Prop({ type: Object, default: {} })
  deliveryStatus: Record<string, { sent: boolean; sentAt?: Date; error?: string }>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Индексы для оптимизации запросов
NotificationSchema.index({ recipientId: 1, recipientType: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ scheduledFor: 1 });
NotificationSchema.index({ expiresAt: 1 });
NotificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });