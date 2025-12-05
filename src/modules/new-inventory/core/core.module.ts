import { Module } from '@nestjs/common';
import { ShelfLifeCalculatorModule } from './shelf-life-calculator';

/**
 * Core модуль new-inventory
 *
 * Содержит:
 * - StoragePreset — пресеты коэффициентов деградации
 * - StorageConditions — схемы условий хранения
 * - ShelfLifeCalculator — сервис расчёта сроков годности
 */
@Module({
  imports: [ShelfLifeCalculatorModule],
  exports: [ShelfLifeCalculatorModule],
})
export class NewInventoryCoreModule {}
