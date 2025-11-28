import { Module } from '@nestjs/common';
import { CommissionService } from './commission.service';

/**
 * =====================================================
 * МОДУЛЬ РАСЧЁТА КОМИССИЙ
 * =====================================================
 * 
 * Отвечает за:
 * - Расчёт базовой ставки комиссии по категории товаров
 * - Расчёт скидок за стаж, объём, качество
 * - Расчёт надбавок за нарушения
 * - Поддержку индивидуальных условий
 * - Прогнозирование улучшений
 * 
 * Диапазон комиссии: 10-40%
 * Минимальная сумма: 50₽ с заказа
 * 
 * @see docs/processes/commission-flow.md
 */
@Module({
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
