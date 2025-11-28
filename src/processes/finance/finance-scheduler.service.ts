import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { 
  SHOP_ACCOUNT_PORT, 
  ShopAccountPort 
} from 'src/modules/finance/shop-account';
import { GetSettlementPeriodsQuery } from 'src/modules/finance/shop-account/shop-account.queries';
import { SettlementPeriodStatus } from 'src/modules/finance/shop-account/schemas/settlement-period.schema';
import { 
  FINANCE_PROCESS_ORCHESTRATOR, 
  FinanceProcessOrchestrator 
} from './finance-process.orchestrator';

/**
 * =====================================================
 * FINANCE SCHEDULER
 * =====================================================
 * 
 * Scheduled jobs для финансовых операций:
 * 
 * 1. Автоматическое закрытие расчётных периодов
 *    - Проверяет периоды с endDate <= сейчас
 *    - Переводит их в статус PENDING_APPROVAL
 *    - Открывает новый период
 * 
 * 2. (Будущее) Автоматическое одобрение периодов старше X дней
 * 3. (Будущее) Напоминания о выводе средств
 */
@Injectable()
export class FinanceSchedulerService {
  private readonly logger = new Logger(FinanceSchedulerService.name);

  constructor(
    @Inject(SHOP_ACCOUNT_PORT) private readonly shopAccountPort: ShopAccountPort,
    @Inject(FINANCE_PROCESS_ORCHESTRATOR) private readonly financeOrchestrator: FinanceProcessOrchestrator,
  ) {}

  /**
   * Проверка и закрытие просроченных расчётных периодов
   * Запускается каждый день в 00:05
   */
  @Cron('5 0 * * *') // Каждый день в 00:05
  async closeExpiredSettlementPeriods(): Promise<void> {
    this.logger.log('Starting closeExpiredSettlementPeriods job...');
    
    try {
      // Получаем активные периоды с истёкшим endDate
      // Используем пагинацию для обработки большого количества периодов
      let page = 1;
      const pageSize = 50;
      let hasMore = true;
      let closedCount = 0;
      
      while (hasMore) {
        const result = await this.shopAccountPort.getSettlementPeriods(
          new GetSettlementPeriodsQuery(
            { status: SettlementPeriodStatus.ACTIVE },
            { page, pageSize }
          )
        );
        
        const now = new Date();
        
        for (const period of result.docs) {
          // Проверяем, истёк ли период
          if (period.endDate && new Date(period.endDate) <= now) {
            try {
              await this.financeOrchestrator.closeSettlementPeriod(period._id.toString());
              closedCount++;
              this.logger.log(`Closed settlement period ${period._id} (shop: ${period.shopAccount})`);
            } catch (error) {
              this.logger.error(
                `Failed to close period ${period._id}: ${error.message}`,
                error.stack
              );
            }
          }
        }
        
        hasMore = result.hasNextPage;
        page++;
      }
      
      this.logger.log(`closeExpiredSettlementPeriods completed. Closed: ${closedCount}`);
    } catch (error) {
      this.logger.error(
        `closeExpiredSettlementPeriods failed: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Логирование статистики финансовой системы (для мониторинга)
   * Запускается каждые 6 часов
   */
  @Cron('0 */6 * * *') // Каждые 6 часов
  async logFinanceStats(): Promise<void> {
    try {
      const activePeriods = await this.shopAccountPort.getSettlementPeriods(
        new GetSettlementPeriodsQuery(
          { status: SettlementPeriodStatus.ACTIVE },
          { page: 1, pageSize: 1 }
        )
      );
      
      const pendingPeriods = await this.shopAccountPort.getSettlementPeriods(
        new GetSettlementPeriodsQuery(
          { status: SettlementPeriodStatus.PENDING_APPROVAL },
          { page: 1, pageSize: 1 }
        )
      );
      
      this.logger.log(
        `Finance stats: Active periods: ${activePeriods.totalDocs}, ` +
        `Pending approval: ${pendingPeriods.totalDocs}`
      );
    } catch (error) {
      this.logger.error(`logFinanceStats failed: ${error.message}`);
    }
  }
}
