import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { ExpirationAlertLevel } from '../batch/batch.enums';
import {
  BatchAlertInfo,
  ExpirationReport,
  LocationAlertSummary,
  AlertSettings,
  DEFAULT_ALERT_SETTINGS,
} from './expiration-alert.types';
import { LocationType } from '../batch-location/batch-location.enums';
import { BatchStatus } from '../batch/batch.enums';
import {
  BATCH_LOCATION_PORT,
  BatchLocationPort,
  BatchLocationQueries,
} from '../batch-location';
import {
  BATCH_PORT,
  BatchPort,
  BatchCommands,
  BatchQueries,
} from '../batch';
import {
  WRITE_OFF_PORT,
  WriteOffPort,
  WriteOffCommands,
} from '../operations/write-off';
import { WriteOffReason } from '../batch/batch.enums';

@Injectable()
export class ExpirationAlertService {
  constructor(
    @Inject(BATCH_LOCATION_PORT)
    private readonly batchLocationPort: BatchLocationPort,
    @Inject(BATCH_PORT) private readonly batchPort: BatchPort,
    @Inject(WRITE_OFF_PORT) private readonly writeOffPort: WriteOffPort,
  ) {}

  /**
   * Получить партии по уровням алертов
   */
  async getBatchesByAlertLevel(query: {
    sellerId: string;
    locationType?: LocationType;
    locationId?: string;
  }): Promise<{
    critical: BatchAlertInfo[];
    warning: BatchAlertInfo[];
    expired: BatchAlertInfo[];
  }> {
    const settings = DEFAULT_ALERT_SETTINGS; // TODO: загружать из настроек продавца

    // Получаем все активные партии продавца
    const batches = await this.batchPort.getExpiring(
      new BatchQueries.GetExpiringBatchesQuery({
        sellerId: query.sellerId,
        daysUntilExpiration: settings.warningDays,
      }),
    );

    const critical: BatchAlertInfo[] = [];
    const warning: BatchAlertInfo[] = [];
    const expired: BatchAlertInfo[] = [];

    const now = new Date();

    for (const batch of batches) {
      const daysUntil = Math.ceil(
        (batch.effectiveExpirationDate.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const level = this.getAlertLevel(daysUntil, settings);

      // Получаем BatchLocations для этой партии
      const locations = await this.batchLocationPort.getByBatch(
        new BatchLocationQueries.GetByBatchQuery(batch._id),
      );

      for (const bl of locations) {
        // Фильтр по локации
        if (query.locationType && bl.locationType !== query.locationType) {
          continue;
        }
        if (
          query.locationId &&
          bl.locationType === LocationType.SHOP &&
          bl.shop?.toHexString() !== query.locationId
        ) {
          continue;
        }
        if (
          query.locationId &&
          bl.locationType === LocationType.WAREHOUSE &&
          bl.warehouse?.toHexString() !== query.locationId
        ) {
          continue;
        }

        if (bl.quantity <= 0) continue;

        const info: BatchAlertInfo = {
          batchId: batch._id.toHexString(),
          batchNumber: batch.batchNumber,
          batchLocationId: bl._id.toHexString(),
          productId: batch.product.toHexString(),
          quantity: bl.quantity,
          reservedQuantity: bl.reservedQuantity,
          availableQuantity: bl.quantity - bl.reservedQuantity,
          expirationDate: batch.effectiveExpirationDate,
          daysUntilExpiration: daysUntil,
          alertLevel: level,
          locationType: bl.locationType,
          locationId:
            bl.locationType === LocationType.SHOP
              ? bl.shop!.toHexString()
              : bl.warehouse!.toHexString(),
          locationName: bl.locationName,
          purchasePrice: bl.purchasePrice,
          totalValue:
            bl.purchasePrice !== undefined
              ? bl.purchasePrice * bl.quantity
              : undefined,
        };

        switch (level) {
          case ExpirationAlertLevel.EXPIRED:
            expired.push(info);
            break;
          case ExpirationAlertLevel.CRITICAL:
            critical.push(info);
            break;
          case ExpirationAlertLevel.WARNING:
            warning.push(info);
            break;
        }
      }
    }

    return { critical, warning, expired };
  }

  /**
   * Генерация ежедневного отчёта
   */
  async generateDailyReport(sellerId: string): Promise<ExpirationReport> {
    const { critical, warning, expired } = await this.getBatchesByAlertLevel({
      sellerId,
    });

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Фильтруем истёкшие сегодня
    const expiredToday = expired.filter((b) => {
      const expDate = new Date(b.expirationDate);
      return (
        expDate.getDate() === now.getDate() &&
        expDate.getMonth() === now.getMonth() &&
        expDate.getFullYear() === now.getFullYear()
      );
    });

    // Истекающие завтра
    const expiringTomorrow = [...critical, ...warning].filter((b) => {
      const expDate = new Date(b.expirationDate);
      return (
        expDate.getDate() === tomorrow.getDate() &&
        expDate.getMonth() === tomorrow.getMonth() &&
        expDate.getFullYear() === tomorrow.getFullYear()
      );
    });

    // Сводка по локациям
    const byLocation = this.aggregateByLocation([...critical, ...warning, ...expired]);

    // Общая стоимость под угрозой
    const totalValueAtRisk =
      [...critical, ...warning, ...expired].reduce(
        (sum, b) => sum + (b.totalValue || 0),
        0,
      );

    return {
      sellerId,
      generatedAt: now,
      expiredToday,
      expiringTomorrow,
      criticalBatches: critical,
      warningBatches: warning,
      byLocation,
      totalValueAtRisk,
    };
  }

  /**
   * Заблокировать истёкшие партии
   */
  async blockExpiredBatches(sellerId?: string): Promise<number> {
    const filter: any = {
      status: BatchStatus.ACTIVE,
      effectiveExpirationDate: { $lt: new Date() },
    };

    if (sellerId) {
      filter.seller = new Types.ObjectId(sellerId);
    }

    // Получаем истёкшие партии
    const expiredBatches = await this.batchPort.getExpiredForWriteOff(
      new BatchQueries.GetExpiredBatchesForWriteOffQuery({
        sellerId: sellerId || undefined,
        expiredDaysAgo: 0,
      }),
    );

    let blocked = 0;

    for (const batch of expiredBatches) {
      await this.batchPort.updateStatus(
        new BatchCommands.UpdateBatchStatusCommand(batch._id, {
          status: BatchStatus.EXPIRED,
        }),
      );
      blocked++;
    }

    return blocked;
  }

  /**
   * Автоматическое списание истёкших партий
   */
  async autoWriteOffExpired(
    sellerId: string,
    daysAfterExpiration: number = 1,
  ): Promise<{ writeOffIds: string[]; totalQuantity: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAfterExpiration);

    // Получаем истёкшие партии
    const expiredBatches = await this.batchPort.getExpiredForWriteOff(
      new BatchQueries.GetExpiredBatchesForWriteOffQuery({
        sellerId,
        expiredDaysAgo: daysAfterExpiration,
      }),
    );

    const writeOffIds: string[] = [];
    let totalQuantity = 0;

    // Группируем по локациям
    const byLocation = new Map<
      string,
      Array<{ batch: any; batchLocation: any }>
    >();

    for (const batch of expiredBatches) {
      const locations = await this.batchLocationPort.getByBatch(
        new BatchLocationQueries.GetByBatchQuery(batch._id),
      );

      for (const bl of locations) {
        if (bl.quantity <= 0) continue;

        const key = `${bl.locationType}:${bl.locationType === LocationType.SHOP ? bl.shop?.toHexString() : bl.warehouse?.toHexString()}`;

        if (!byLocation.has(key)) {
          byLocation.set(key, []);
        }
        byLocation.get(key)!.push({ batch, batchLocation: bl });
      }
    }

    // Создаём списания по локациям
    for (const [key, items] of byLocation) {
      const [locationType, locationId] = key.split(':');
      const firstItem = items[0].batchLocation;

      const writeOff = await this.writeOffPort.create(
        new WriteOffCommands.CreateWriteOffCommand({
          seller: sellerId,
          locationType: locationType as LocationType,
          locationId,
          locationName: firstItem.locationName,
          reason: WriteOffReason.QUALITY_ISSUE,
          items: items.map(({ batch, batchLocation }) => ({
            batch: batch._id,
            product: batch.product,
            quantity: batchLocation.quantity,
            purchasePrice: batchLocation.purchasePrice,
            comment: `Auto write-off: expired on ${batch.effectiveExpirationDate.toISOString().split('T')[0]}`,
          })),
          comment: 'Automatic write-off of expired batches',
        }),
      );

      // Подтверждаем списание
      await this.writeOffPort.confirm(
        new WriteOffCommands.ConfirmWriteOffCommand(writeOff._id, {
          confirmedBy: sellerId as any, // System
        }),
      );

      writeOffIds.push(writeOff._id.toHexString());
      totalQuantity += items.reduce(
        (sum, { batchLocation }) => sum + batchLocation.quantity,
        0,
      );
    }

    return { writeOffIds, totalQuantity };
  }

  /**
   * Получить сводку алертов для дашборда
   */
  async getAlertsSummary(sellerId: string): Promise<{
    criticalCount: number;
    warningCount: number;
    expiredCount: number;
    totalValueAtRisk: number;
  }> {
    const { critical, warning, expired } = await this.getBatchesByAlertLevel({
      sellerId,
    });

    return {
      criticalCount: critical.length,
      warningCount: warning.length,
      expiredCount: expired.length,
      totalValueAtRisk:
        [...critical, ...warning, ...expired].reduce(
          (sum, b) => sum + (b.totalValue || 0),
          0,
        ),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  private getAlertLevel(
    daysUntilExpiration: number,
    settings: AlertSettings,
  ): ExpirationAlertLevel {
    if (daysUntilExpiration <= 0) {
      return ExpirationAlertLevel.EXPIRED;
    }
    if (daysUntilExpiration <= settings.criticalDays) {
      return ExpirationAlertLevel.CRITICAL;
    }
    if (daysUntilExpiration <= settings.warningDays) {
      return ExpirationAlertLevel.WARNING;
    }
    return ExpirationAlertLevel.NORMAL;
  }

  private aggregateByLocation(
    batches: BatchAlertInfo[],
  ): LocationAlertSummary[] {
    const map = new Map<string, LocationAlertSummary>();

    for (const batch of batches) {
      const key = `${batch.locationType}:${batch.locationId}`;

      if (!map.has(key)) {
        map.set(key, {
          locationType: batch.locationType,
          locationId: batch.locationId,
          locationName: batch.locationName,
          criticalCount: 0,
          warningCount: 0,
          expiredCount: 0,
          criticalValue: 0,
          warningValue: 0,
          expiredValue: 0,
        });
      }

      const summary = map.get(key)!;
      const value = batch.totalValue || 0;

      switch (batch.alertLevel) {
        case ExpirationAlertLevel.CRITICAL:
          summary.criticalCount++;
          summary.criticalValue += value;
          break;
        case ExpirationAlertLevel.WARNING:
          summary.warningCount++;
          summary.warningValue += value;
          break;
        case ExpirationAlertLevel.EXPIRED:
          summary.expiredCount++;
          summary.expiredValue += value;
          break;
      }
    }

    return Array.from(map.values());
  }
}

export const EXPIRATION_ALERT_SERVICE = Symbol('EXPIRATION_ALERT_SERVICE');
