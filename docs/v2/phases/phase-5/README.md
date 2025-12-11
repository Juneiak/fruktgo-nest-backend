# Фаза 5: Scale

> Оптимизация под нагрузку, интеграции, масштабирование.

**Длительность:** Ongoing

**Зависимости:** Может начинаться после Фазы 3

---

## Цели

1. Быстрый поиск и витрина
2. Интеграции с внешними системами
3. Несколько провайдеров доставки
4. Полная observability

---

## Этапы

| Этап | Название | Модули | Что делаем |
|------|----------|--------|------------|
| 1 | Кэширование | STOREFRONT | Redis Cache |
| 2 | Поиск | STOREFRONT | ElasticSearch |
| 3 | Интеграции | INTEGRATIONS | Импорт/экспорт, webhooks |
| 4 | Логистика | LOGISTICS | SLA, fallback провайдеры |
| 5 | Observability | Infra | OpenTelemetry полный |
| 6 | Data Lifecycle | Infra | Retention, архивация |

---

## Этап 1: Кэширование

**Модуль:** STOREFRONT

**Задачи:**
- Redis Cache для ShopProduct листингов
- Cache invalidation при изменении
- TTL стратегия по типам данных
- Warm-up при старте

**Детали:** [stage-1.md](./stage-1.md)

---

## Этап 2: Поиск (ElasticSearch)

**Модуль:** STOREFRONT

**Задачи:**
- ES индекс для товаров
- Синхронизация CATALOG/INVENTORY → ES
- Фасетный поиск (фильтры)
- Автокомплит
- Фильтры по city

**Детали:** [stage-2.md](./stage-2.md)

---

## Этап 3: Интеграции (INTEGRATIONS)

**Модуль:** INTEGRATIONS

**Задачи:**
- Импорт товаров (YML, CSV, Excel)
- Экспорт фидов (Яндекс.Маркет, Google Shopping)
- Webhooks для селлеров (новый заказ, статус, возврат)
- Public API Gateway для ERP (1C, SAP)

**Детали:** [stage-3.md](./stage-3.md)

---

## Этап 4: Логистика расширенная

**Модуль:** LOGISTICS

**Задачи:**
- SLA по времени доставки
- Fallback провайдеры (СДЭК, DPD, Uber)
- Выбор оптимального провайдера
- Трекинг от 3PL
- ПВЗ и постаматы

**Детали:** [stage-4.md](./stage-4.md)

---

## Этап 5: Observability

**Задачи:**
- OpenTelemetry: traces, metrics, logs
- Distributed tracing
- SLO/SLI определение
- Алерты на нарушение SLO
- Grafana дашборды

**Детали:** [stage-5.md](./stage-5.md)

---

## Этап 6: Data Lifecycle

**Задачи:**
- TTL для AUDIT логов (2 года / 1 год)
- Архивация старых заказов
- GDPR: удаление данных по запросу
- Бэкапы и восстановление
- Cold storage для архивов

**Детали:** [stage-6.md](./stage-6.md)

---

## Критерии готовности

- [ ] Витрина отвечает <100ms (p99)
- [ ] ES поиск работает
- [ ] Импорт/экспорт товаров работает
- [ ] Webhooks для селлеров работают
- [ ] Fallback доставка работает
- [ ] Трейсы видны в Jaeger/Grafana
