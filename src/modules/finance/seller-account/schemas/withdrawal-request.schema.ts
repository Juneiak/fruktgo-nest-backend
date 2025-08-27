import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, SchemaTypes, Types } from "mongoose";
import * as mongooseLeanVirtuals from 'mongoose-lean-virtuals';

export enum WithdrawalRequestStatus {
  PENDING = 'pending',          // Ожидает обработки
  PROCESSING = 'processing',    // В процессе обработки
  COMPLETED = 'completed',      // Завершен
  REJECTED = 'rejected',        // Отклонен
  FAILED = 'failed',            // Ошибка при обработке
}

@Schema({ 
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
  id: false
})
export class WithdrawalRequest extends Document {
  _id: Types.ObjectId;
  withdrawalRequestId: string;
  createdAt: Date;
  updatedAt: Date;

  // Связь с аккаунтом продавца
  @Prop({ type: SchemaTypes.ObjectId, ref: 'SellerAccount', required: true })
  sellerAccount: Types.ObjectId;

  // Сумма запроса на вывод
  @Prop({ type: SchemaTypes.Number, required: true })
  amount: number;

  // Статус запроса
  @Prop({ 
    type: SchemaTypes.String, 
    enum: Object.values(WithdrawalRequestStatus), 
    default: WithdrawalRequestStatus.PENDING 
  })
  status: WithdrawalRequestStatus;

  // Дата завершения обработки запроса
  @Prop({ type: SchemaTypes.Date, default: null })
  completedAt: Date;

  // Банковские реквизиты для вывода средств (копируются из аккаунта на момент запроса)
  @Prop({ type: SchemaTypes.Mixed, required: true })
  bankDetails: {
    accountNumber: string;      // Номер счета
    bankName: string;           // Название банка
    bik: string;                // БИК
    correspondentAccount?: string; // Корреспондентский счет
    accountHolder: string;      // Держатель счета
    inn: string;                // ИНН
  };

  // Комментарий администратора (при отклонении или ошибке)
  @Prop({ type: SchemaTypes.String, default: null })
  adminComment: string | null;

  // Внешний идентификатор транзакции (например, ID из банковской системы)
  @Prop({ type: SchemaTypes.String, default: null })
  externalTransactionId: string | null;
}

export const WithdrawalRequestSchema = SchemaFactory.createForClass(WithdrawalRequest);
WithdrawalRequestSchema.plugin(mongooseLeanVirtuals as any);

WithdrawalRequestSchema.virtual('withdrawalRequestId').get(function (this: WithdrawalRequest): string {
  return this._id.toString();
});
