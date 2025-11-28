import { Injectable } from '@nestjs/common';
import { ProductCategory } from './commission.enums';
import {
  BASE_RATES,
  COMMISSION_LIMITS,
  ShopMetrics,
  CommissionDiscounts,
  CommissionSurcharges,
  CommissionCalculation,
  IndividualTerms,
  CommissionForecast,
} from './commission.types';

/**
 * =====================================================
 * СЕРВИС РАСЧЁТА КОМИССИЙ
 * =====================================================
 * 
 * Рассчитывает комиссию платформы для магазина на основе:
 * 1. Базовой ставки по категории товаров
 * 2. Скидок за стаж, объём, качество
 * 3. Надбавок за нарушения
 * 4. Индивидуальных условий (если есть)
 * 
 * Диапазон комиссии: 10-40%
 * Минимальная сумма: 50₽ с заказа
 */
@Injectable()
export class CommissionService {

  /**
   * Полный расчёт комиссии для магазина
   * 
   * @param revenue - Оборот за период (₽)
   * @param mainCategory - Основная категория товаров магазина
   * @param metrics - Метрики магазина (рейтинг, стаж, объёмы и т.д.)
   * @param individualTerms - Индивидуальные условия (опционально)
   * @returns Полная детализация расчёта комиссии
   */
  calculateCommission(
    revenue: number,
    mainCategory: ProductCategory,
    metrics: ShopMetrics,
    individualTerms?: IndividualTerms,
  ): CommissionCalculation {
    
    // 1. Проверяем индивидуальные условия
    if (individualTerms && this.isIndividualTermsActive(individualTerms)) {
      return this.calculateWithIndividualTerms(revenue, mainCategory, individualTerms);
    }

    // 2. Базовая ставка по категории
    const baseRate = this.getBaseRate(mainCategory);

    // 3. Рассчитываем скидки
    const discounts = this.calculateDiscounts(metrics);

    // 4. Рассчитываем надбавки
    const surcharges = this.calculateSurcharges(metrics);

    // 5. Итоговая ставка = база + скидки + надбавки
    let finalRate = baseRate + discounts.total + surcharges.total;

    // 6. Применяем ограничения
    finalRate = Math.max(COMMISSION_LIMITS.MIN_RATE, Math.min(COMMISSION_LIMITS.MAX_RATE, finalRate));

    // 7. Рассчитываем сумму комиссии
    const amount = Math.max(
      revenue * finalRate / 100,
      COMMISSION_LIMITS.MIN_AMOUNT
    );

    return {
      baseRate,
      mainCategory,
      discounts,
      surcharges,
      finalRate,
      revenue,
      amount: Math.round(amount * 100) / 100, // Округляем до копеек
      calculatedAt: new Date(),
    };
  }

  /**
   * =====================================================
   * ПОЛУЧЕНИЕ БАЗОВОЙ СТАВКИ
   * =====================================================
   */
  getBaseRate(category: ProductCategory): number {
    return BASE_RATES[category] ?? BASE_RATES[ProductCategory.OTHER];
  }

  /**
   * =====================================================
   * РАСЧЁТ СКИДОК
   * =====================================================
   * 
   * Скидки снижают комиссию за хорошую работу.
   * Все значения отрицательные (уменьшают ставку).
   */
  calculateDiscounts(metrics: ShopMetrics): CommissionDiscounts {
    const loyalty = this.getLoyaltyDiscount(metrics.monthsActive);
    const volume = this.getVolumeDiscount(metrics.monthlyRevenue);
    const quality = this.getQualityDiscount(metrics);
    const program = 0; // TODO: Добавить логику программ

    // Суммируем, но не больше максимальной скидки
    let total = loyalty + volume + quality + program;
    total = Math.max(COMMISSION_LIMITS.MAX_DISCOUNT, total);

    return { loyalty, volume, quality, program, total };
  }

  /**
   * Скидка за стаж работы с платформой
   * 
   * | Стаж     | Скидка |
   * |----------|--------|
   * | 3+ мес   | -1%    |
   * | 6+ мес   | -2%    |
   * | 12+ мес  | -3%    |
   * | 24+ мес  | -5%    |
   */
  private getLoyaltyDiscount(monthsActive: number): number {
    if (monthsActive >= 24) return -5;
    if (monthsActive >= 12) return -3;
    if (monthsActive >= 6) return -2;
    if (monthsActive >= 3) return -1;
    return 0;
  }

  /**
   * Скидка за объём продаж
   * 
   * | Оборот/мес | Скидка |
   * |------------|--------|
   * | 300К+      | -1%    |
   * | 500К+      | -2%    |
   * | 1М+        | -3%    |
   * | 2М+        | -5%    |
   */
  private getVolumeDiscount(monthlyRevenue: number): number {
    if (monthlyRevenue >= 2_000_000) return -5;
    if (monthlyRevenue >= 1_000_000) return -3;
    if (monthlyRevenue >= 500_000) return -2;
    if (monthlyRevenue >= 300_000) return -1;
    return 0;
  }

  /**
   * Скидка за качество обслуживания
   * 
   * - Рейтинг 4.7+: -1%
   * - Рейтинг 4.9+: -2%
   * - SLA 98%+: -1%
   * - Жалобы <1%: -1%
   * 
   * Максимум: -4%
   */
  private getQualityDiscount(metrics: ShopMetrics): number {
    let discount = 0;

    // За рейтинг
    if (metrics.rating >= 4.9) discount -= 2;
    else if (metrics.rating >= 4.7) discount -= 1;

    // За соблюдение SLA
    if (metrics.slaCompliance >= 98) discount -= 1;

    // За низкий % жалоб
    if (metrics.complaintsRate < 0.01) discount -= 1;

    return Math.max(-4, discount);
  }

  /**
   * =====================================================
   * РАСЧЁТ НАДБАВОК (ШТРАФНЫХ)
   * =====================================================
   * 
   * Надбавки увеличивают комиссию за плохую работу.
   * Все значения положительные (увеличивают ставку).
   */
  calculateSurcharges(metrics: ShopMetrics): CommissionSurcharges {
    const quality = this.getQualitySurcharge(metrics);
    const operation = this.getOperationSurcharge(metrics);
    const finance = this.getFinanceSurcharge(metrics);

    // Суммируем, но не больше максимальной надбавки
    let total = quality + operation + finance;
    total = Math.min(COMMISSION_LIMITS.MAX_SURCHARGE, total);

    return { quality, operation, finance, total };
  }

  /**
   * Надбавка за низкое качество
   * 
   * | Проблема           | Критерий | Надбавка |
   * |--------------------|----------|----------|
   * | Низкий рейтинг     | <3.5     | +3%      |
   * | Очень низкий       | <3.0     | +5%      |
   * | Много возвратов    | >5%      | +2%      |
   * | Много жалоб        | >5%      | +3%      |
   */
  private getQualitySurcharge(metrics: ShopMetrics): number {
    let surcharge = 0;

    // За низкий рейтинг
    if (metrics.rating < 3.0) surcharge += 5;
    else if (metrics.rating < 3.5) surcharge += 3;

    // За много возвратов
    if (metrics.returnRate > 0.05) surcharge += 2;

    // За много жалоб
    if (metrics.complaintsRate > 0.05) surcharge += 3;

    return Math.min(10, surcharge);
  }

  /**
   * Надбавка за операционные нарушения
   * 
   * | Нарушение      | Частота | Надбавка |
   * |----------------|---------|----------|
   * | Отмены заказов | >10%    | +2%      |
   * | Отмены заказов | >20%    | +5%      |
   * | SLA compliance | <80%    | +3%      |
   * | SLA compliance | <60%    | +5%      |
   */
  private getOperationSurcharge(metrics: ShopMetrics): number {
    let surcharge = 0;

    // За отмены
    if (metrics.cancellationRate > 0.20) surcharge += 5;
    else if (metrics.cancellationRate > 0.10) surcharge += 2;

    // За нарушение SLA
    if (metrics.slaCompliance < 60) surcharge += 5;
    else if (metrics.slaCompliance < 80) surcharge += 3;

    return Math.min(10, surcharge);
  }

  /**
   * Надбавка за финансовые нарушения
   * 
   * | Нарушение   | Сумма        | Надбавка |
   * |-------------|--------------|----------|
   * | Штрафы      | >5% оборота  | +2%      |
   * | Штрафы      | >10% оборота | +5%      |
   * | Недостачи   | >2% оборота  | +3%      |
   */
  private getFinanceSurcharge(metrics: ShopMetrics): number {
    let surcharge = 0;

    // За штрафы
    if (metrics.penaltiesRate > 0.10) surcharge += 5;
    else if (metrics.penaltiesRate > 0.05) surcharge += 2;

    // За недостачи
    if (metrics.shortagesRate > 0.02) surcharge += 3;

    return Math.min(8, surcharge);
  }

  /**
   * =====================================================
   * ИНДИВИДУАЛЬНЫЕ УСЛОВИЯ
   * =====================================================
   */
  private isIndividualTermsActive(terms: IndividualTerms): boolean {
    const now = new Date();
    if (now < terms.validFrom) return false;
    if (terms.validTo && now > terms.validTo) return false;
    return true;
  }

  private calculateWithIndividualTerms(
    revenue: number,
    mainCategory: ProductCategory,
    terms: IndividualTerms,
  ): CommissionCalculation {
    let finalRate: number;
    let amount: number;

    switch (terms.type) {
      case 'fixed_rate':
        // Фиксированная ставка
        finalRate = terms.fixedRate ?? BASE_RATES[mainCategory];
        amount = revenue * finalRate / 100;
        break;

      case 'progressive':
        // Прогрессивная шкала
        amount = 0;
        const tiers = terms.progressiveTiers ?? [];
        let remaining = revenue;

        for (const tier of tiers) {
          const tierMax = tier.to ?? Infinity;
          const tierAmount = Math.min(remaining, tierMax - tier.from);
          if (tierAmount > 0) {
            amount += tierAmount * tier.rate / 100;
            remaining -= tierAmount;
          }
          if (remaining <= 0) break;
        }
        finalRate = revenue > 0 ? (amount / revenue) * 100 : 0;
        break;

      case 'category_discount':
        // Категориальные скидки
        const baseRate = BASE_RATES[mainCategory];
        const discount = terms.categoryDiscounts?.[mainCategory] ?? 0;
        finalRate = baseRate + discount;
        amount = revenue * finalRate / 100;
        break;

      default:
        finalRate = BASE_RATES[mainCategory];
        amount = revenue * finalRate / 100;
    }

    // Применяем минимальную сумму
    amount = Math.max(amount, COMMISSION_LIMITS.MIN_AMOUNT);

    return {
      baseRate: BASE_RATES[mainCategory],
      mainCategory,
      discounts: { loyalty: 0, volume: 0, quality: 0, program: 0, total: 0 },
      surcharges: { quality: 0, operation: 0, finance: 0, total: 0 },
      finalRate: Math.round(finalRate * 100) / 100,
      revenue,
      amount: Math.round(amount * 100) / 100,
      calculatedAt: new Date(),
    };
  }

  /**
   * =====================================================
   * ПРОГНОЗ УЛУЧШЕНИЙ
   * =====================================================
   * 
   * Показывает продавцу, как можно снизить комиссию.
   */
  getForecast(
    currentRate: number,
    metrics: ShopMetrics,
    monthlyRevenue: number,
  ): CommissionForecast {
    const improvements: CommissionForecast['improvements'] = [];

    // Проверяем возможные улучшения
    if (metrics.monthlyRevenue < 500_000) {
      improvements.push({
        condition: 'Достигните оборота 500К₽/мес',
        newRate: currentRate - 1,
        saving: Math.round(monthlyRevenue * 0.01),
      });
    }

    if (metrics.monthlyRevenue < 1_000_000) {
      improvements.push({
        condition: 'Достигните оборота 1М₽/мес',
        newRate: currentRate - 2,
        saving: Math.round(monthlyRevenue * 0.02),
      });
    }

    if (metrics.rating < 4.9 && metrics.rating >= 4.7) {
      improvements.push({
        condition: 'Поднимите рейтинг до 4.9',
        newRate: currentRate - 1,
        saving: Math.round(monthlyRevenue * 0.01),
      });
    }

    if (metrics.cancellationRate > 0.05) {
      improvements.push({
        condition: 'Снизьте отмены до 5%',
        newRate: currentRate - 2,
        saving: Math.round(monthlyRevenue * 0.02),
      });
    }

    return { currentRate, improvements };
  }
}
