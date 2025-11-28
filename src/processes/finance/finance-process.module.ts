import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { FinanceProcessOrchestrator, FINANCE_PROCESS_ORCHESTRATOR } from './finance-process.orchestrator';
import { FinanceSchedulerService } from './finance-scheduler.service';

/**
 * =====================================================
 * МОДУЛЬ ФИНАНСОВЫХ ПРОЦЕССОВ
 * =====================================================
 * 
 * Координирует сложные финансовые операции:
 * - Закрытие/одобрение расчётных периодов
 * - Перевод средств продавцам
 * - Обработка выводов
 * - Запись дохода от заказов
 * - Возвраты и штрафы
 * 
 * Scheduled jobs:
 * - Автозакрытие истёкших расчётных периодов (ежедневно 00:05)
 * - Логирование статистики (каждые 6 часов)
 * 
 * Зависит от:
 * - ShopAccountModule (SHOP_ACCOUNT_PORT)
 * - SellerAccountModule (SELLER_ACCOUNT_PORT)
 * - PlatformAccountModule (PLATFORM_ACCOUNT_PORT)
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  providers: [
    FinanceProcessOrchestrator,
    {
      provide: FINANCE_PROCESS_ORCHESTRATOR,
      useExisting: FinanceProcessOrchestrator,
    },
    FinanceSchedulerService,
  ],
  exports: [FINANCE_PROCESS_ORCHESTRATOR],
})
export class FinanceProcessModule {}
