import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderPaymentSchema, OrderPayment } from './order-payment.schema';
import { OrderPaymentService } from './order-payment.service';
import { PlatformAccountModule } from '../platform-account/platform-account.module';

/**
 * =====================================================
 * МОДУЛЬ ПЛАТЕЖЕЙ
 * =====================================================
 * 
 * Отвечает за интеграцию с ЮKassa:
 * - Создание платежей (двухшаговая оплата)
 * - Обработку webhook
 * - Capture/Cancel платежей
 * - Возвраты
 * 
 * При capture создаётся транзакция ACQUIRING_INCOME на счёте платформы.
 * 
 * @see docs/processes/payment-flow.md
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrderPayment.name, schema: OrderPaymentSchema }
    ]),
    forwardRef(() => PlatformAccountModule),
  ],
  controllers: [],
  providers: [OrderPaymentService],
  exports: [OrderPaymentService],
})
export class OrderPaymentModule {}
