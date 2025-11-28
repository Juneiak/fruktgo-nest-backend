/**
 * =====================================================
 * ТИПЫ ФИНАНСОВОГО ОРКЕСТРАТОРА
 * =====================================================
 */

/**
 * Результат закрытия расчётного периода
 */
export interface CloseSettlementPeriodResult {
  periodId: string;
  totalAmount: number;
  status: 'closed';
}

/**
 * Результат одобрения расчётного периода
 */
export interface ApproveSettlementPeriodResult {
  periodId: string;
  releasedAmount: number;
  sellerAccountId: string;
  newBalance: number;
}

/**
 * Результат создания заявки на вывод
 */
export interface CreateWithdrawalResult {
  withdrawalRequestId: string;
  amount: number;
  status: 'pending';
}

/**
 * Результат обработки платежа заказа
 */
export interface ProcessOrderPaymentResult {
  paymentId: string;
  transactionId: string;
  amount: number;
}

/**
 * Результат обработки возврата
 */
export interface ProcessRefundResult {
  refundId: string;
  transactionId: string;
  amount: number;
}

/**
 * Результат начисления штрафа
 */
export interface ApplyPenaltyResult {
  penaltyId: string;
  transactionId: string;
  amount: number;
}

/**
 * Input для записи дохода от заказа
 * 
 * Если commissionAmount не передан, используется shopAccount.commissionPercent
 */
export interface RecordOrderIncomeInput {
  shopAccountId: string;
  orderId: string;
  orderAmount: number;
  /** Если не передан, рассчитывается из shopAccount.commissionPercent */
  commissionAmount?: number;
}

/**
 * Input для обработки возврата
 */
export interface ProcessRefundInput {
  shopAccountId: string;
  orderId: string;
  refundAmount: number;
  reason: string;
}

/**
 * Input для начисления штрафа
 */
export interface ApplyPenaltyInput {
  shopAccountId: string;
  orderId?: string;
  amount: number;
  reason: string;
  description: string;
}
