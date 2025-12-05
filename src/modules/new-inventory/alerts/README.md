# Alerts

Алерты по срокам годности и условиям хранения.

## Структура

```
alerts/
├── alerts.schema.ts    # Схема
├── alerts.enums.ts     # Типы алертов
├── alerts.commands.ts  # Команды
├── alerts.queries.ts   # Запросы
├── alerts.port.ts      # Интерфейс
├── alerts.service.ts   # Реализация
├── alerts.module.ts    # NestJS модуль
└── index.ts
```

## InventoryAlert

**Что это:** Уведомление о проблеме со складом — истекающие сроки, нарушение условий, низкие остатки.

```typescript
InventoryAlert {
  seller,
  
  type,                     // Тип алерта
  severity,                 // INFO, WARNING, CRITICAL
  
  // Контекст
  product,
  batch,
  location,
  
  // Детали
  message,
  data: {                   // Специфичные данные
    daysUntilExpiration?,
    temperature?,
    expectedTemperature?,
    currentStock?,
    reorderPoint?,
  },
  
  // Статус
  status,                   // ACTIVE, ACKNOWLEDGED, RESOLVED, DISMISSED
  
  createdAt,
  acknowledgedAt,
  acknowledgedBy,
  resolvedAt,
}
```

## Типы алертов

| Type | Severity | Описание |
|------|----------|----------|
| `EXPIRING_SOON` | WARNING | Срок истекает через 3-7 дней |
| `EXPIRING_CRITICAL` | CRITICAL | Срок истекает через 1-2 дня |
| `EXPIRED` | CRITICAL | Срок истёк |
| `TEMPERATURE_DEVIATION` | WARNING | Температура вне нормы |
| `HUMIDITY_DEVIATION` | WARNING | Влажность вне нормы |
| `LOW_STOCK` | INFO | Остаток ниже reorderPoint |
| `OUT_OF_STOCK` | WARNING | Нет в наличии |
| `FRESHNESS_LOW` | WARNING | Свежесть < 3 из 10 |

## Как создаются алерты

**Автоматически по cron:**

```typescript
// Каждый день в 6:00
@Cron('0 6 * * *')
async checkExpiringBatches() {
  // Находим партии со сроком < 7 дней
  // Создаём алерты EXPIRING_SOON / EXPIRING_CRITICAL
}

// Каждый час
@Cron('0 * * * *')
async checkConditions() {
  // Проверяем температуру/влажность в локациях
  // Создаём алерты при отклонении
}
```

**При операциях:**
```typescript
// После продажи — проверяем остаток
if (newStock < product.reorderPoint) {
  await alertsPort.create(new CreateAlertCommand({
    type: AlertType.LOW_STOCK,
    severity: AlertSeverity.INFO,
    product, location,
    data: { currentStock: newStock, reorderPoint },
  }));
}
```

## Дуракоустойчивость

**Алерты НЕ блокируют операции:**
- Можно продавать товар с истекающим сроком (со скидкой)
- Можно принимать товар при нарушении температуры (с пометкой)
- Алерты = информирование, не блокировка

## Команды

```typescript
// Создать алерт
new AlertsCommands.CreateAlertCommand({
  type, severity,
  product, batch, location,
  message, data,
});

// Подтвердить (увидел)
new AlertsCommands.AcknowledgeAlertCommand(alertId, employeeId);

// Разрешить (проблема решена)
new AlertsCommands.ResolveAlertCommand(alertId, resolution);

// Отклонить (ложный алерт)
new AlertsCommands.DismissAlertCommand(alertId, reason);
```

## Запросы

```typescript
// Активные алерты продавца
new AlertsQueries.GetActiveAlertsQuery(sellerId);

// Алерты по локации
new AlertsQueries.GetLocationAlertsQuery(locationId);

// Критические алерты
new AlertsQueries.GetCriticalAlertsQuery(sellerId);

// Статистика
new AlertsQueries.GetAlertStatisticsQuery({
  sellerId,
  fromDate, toDate,
});
```

## Пример: панель алертов

```typescript
const alerts = await alertsPort.getActiveAlerts(
  new AlertsQueries.GetActiveAlertsQuery(sellerId),
);

// alerts:
// [
//   { type: 'EXPIRING_CRITICAL', severity: 'CRITICAL', 
//     message: 'Молоко "Простоквашино" истекает завтра', 
//     data: { daysUntilExpiration: 1 } },
//   
//   { type: 'TEMPERATURE_DEVIATION', severity: 'WARNING',
//     message: 'Холодильник №2: 8°C (норма 2-6°C)',
//     data: { temperature: 8, expectedTemperature: 4 } },
//   
//   { type: 'LOW_STOCK', severity: 'INFO',
//     message: 'Яблоки: осталось 3 кг (мин. 10 кг)',
//     data: { currentStock: 3, reorderPoint: 10 } },
// ]
```

## Экспорт

```typescript
import {
  ALERTS_PORT, AlertsPort,
  InventoryAlert, AlertType, AlertSeverity, AlertStatus,
  AlertsCommands, AlertsQueries,
} from 'src/modules/new-inventory/alerts';
```
