import { Module } from '@nestjs/common';
import { ShopProcessOrchestrator, SHOP_PROCESS_ORCHESTRATOR } from './shop-process.orchestrator';

/**
 * =====================================================
 * МОДУЛЬ SHOP PROCESS
 * =====================================================
 * 
 * Оркестратор для создания магазинов:
 * - Создание ShopAccount
 * - Открытие первого расчётного периода
 * - Создание Shop
 */
@Module({
  providers: [
    ShopProcessOrchestrator,
    {
      provide: SHOP_PROCESS_ORCHESTRATOR,
      useExisting: ShopProcessOrchestrator,
    },
  ],
  exports: [SHOP_PROCESS_ORCHESTRATOR],
})
export class ShopProcessModule {}
