import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Penalty, PenaltySchema } from './penalty.schema';
import { PenaltyService } from './penalty.service';
import { PENALTY_PORT } from './penalty.port';

/**
 * =====================================================
 * МОДУЛЬ PENALTY (ШТРАФЫ)
 * =====================================================
 * 
 * Штрафы назначаются магазину за нарушения:
 * - ORDER_DELAY — задержка заказа
 * - PRODUCT_QUALITY — проблемы с качеством
 * - PRODUCT_MISMATCH — несоответствие описанию
 * - RULE_VIOLATION — нарушение правил платформы
 * 
 * Lifecycle: CREATED → CONTESTED (опционально) → CONFIRMED/CANCELED
 * 
 * @see docs/modules/main/finance.md
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Penalty.name, schema: PenaltySchema },
    ]),
  ],
  providers: [
    PenaltyService,
    {
      provide: PENALTY_PORT,
      useExisting: PenaltyService,
    },
  ],
  exports: [PENALTY_PORT],
})
export class PenaltyModule {}
