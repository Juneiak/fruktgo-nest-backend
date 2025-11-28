import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Refund, RefundSchema } from './refund.schema';
import { RefundService } from './refund.service';
import { REFUND_PORT } from './refund.port';

/**
 * =====================================================
 * МОДУЛЬ REFUND (ВОЗВРАТЫ)
 * =====================================================
 * 
 * Возвраты средств клиенту за заказ или его часть:
 * - CUSTOMER_REQUEST — по запросу клиента
 * - PRODUCT_QUALITY — проблема с качеством
 * - DELIVERY_ISSUE — проблема с доставкой
 * - ORDER_MISTAKE — ошибка в заказе
 * - OUT_OF_STOCK — товар закончился
 * 
 * Lifecycle: CREATED → PROCESSING → COMPLETED/FAILED/CANCELED
 * 
 * @see docs/modules/main/finance.md
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Refund.name, schema: RefundSchema },
    ]),
  ],
  providers: [
    RefundService,
    {
      provide: REFUND_PORT,
      useExisting: RefundService,
    },
  ],
  exports: [REFUND_PORT],
})
export class RefundModule {}
