import { Module } from "@nestjs/common";
import { ShopAccountModule } from "./shop-account/shop-account.module";
import { SellerAccountModule } from "./seller-account/seller-account.module";
import { PlatformAccountModule } from "./platform-account/platform-account.module";
import { PenaltyModule } from "./penalty/penalty.module";
import { RefundModule } from "./refund/refund.module";
import { OrderPaymentModule } from "./order-payment/order-payment.module";
import { CommissionModule } from "./commission/commission.module";

/**
 * =====================================================
 * ФИНАНСОВЫЙ МОДУЛЬ
 * =====================================================
 * 
 * Объединяет все финансовые подмодули платформы:
 * 
 * ## Подмодули:
 * 
 * ### ShopAccountModule
 * Счета магазинов и расчётные периоды:
 * - ShopAccount — счёт магазина
 * - SettlementPeriod — расчётный период (14-21 день)
 * - SettlementPeriodTransaction — транзакции в периоде
 * 
 * ### SellerAccountModule
 * Счета продавцов и выводы средств:
 * - SellerAccount — баланс продавца (сумма со всех магазинов)
 * - WithdrawalRequest — заявки на вывод средств
 * 
 * ### OrderPaymentModule
 * Интеграция с ЮKassa:
 * - OrderPayment — платежи заказов
 * - Двухшаговая оплата (hold → capture)
 * - Webhook обработка
 * 
 * ### PenaltyModule
 * Система штрафов:
 * - Penalty — штрафы магазинов
 * - Оспаривание и подтверждение
 * 
 * ### RefundModule
 * Возвраты клиентам:
 * - Refund — записи о возвратах
 * - Полный и частичный возврат
 * 
 * ### CommissionModule
 * Расчёт комиссий:
 * - Базовые ставки по категориям (10-25%)
 * - Скидки за стаж, объём, качество
 * - Надбавки за нарушения
 * - Диапазон: 10-40%
 * 
 * ## Денежный поток:
 * ```
 * Клиент оплачивает → OrderPayment
 *       ↓
 * Заказ завершён → SettlementPeriodTransaction
 *       ↓
 * Период закрыт → SettlementPeriod.status = RELEASED
 *       ↓
 * Деньги переводятся → SellerAccount.balance += amount
 *       ↓
 * Продавец запрашивает вывод → WithdrawalRequest
 *       ↓
 * Админ подтверждает → Деньги на банк продавца
 * ```
 * 
 * @see docs/processes/finance-flow.md
 * @see docs/processes/payment-flow.md
 * @see docs/processes/commission-flow.md
 */
@Module({
  imports: [
    ShopAccountModule,
    SellerAccountModule,
    PlatformAccountModule,
    PenaltyModule,
    RefundModule,
    OrderPaymentModule,
    CommissionModule,
  ],
  exports: [
    ShopAccountModule,
    SellerAccountModule,
    PlatformAccountModule,
    PenaltyModule,
    RefundModule,
    OrderPaymentModule,
    CommissionModule,
  ],
})
export class FinanceModule {}
