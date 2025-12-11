# Фаза 4: Operations & Admin

> Инструменты администрирования платформы, модерация, аудит.

**Длительность:** 2-3 недели

**Зависимости:** Требует Фазы 2 (FINANCE) и частично Фазы 3 (SUPPORT)

---

## Цели

1. Сотрудники платформы могут модерировать контент
2. Админ-панель для управления платформой
3. Аудит-логи всех критичных действий
4. Расширенные складские операции
5. Базовая аналитика

---

## Этапы

| Этап | Название | Модули | Что делаем |
|------|----------|--------|------------|
| 1 | Платформа | PLATFORM | PlatformStaff, роли, auth |
| 2 | Модерация | PLATFORM | Модерация селлеров, магазинов, товаров |
| 3 | Admin Panel | PLATFORM | Своя админ-панель (React) |
| 4 | Аудит | AUDIT | Логирование, просмотр, фильтры |
| 5 | Аналитика | ANALYTICS | Базовые дашборды |
| 6 | Склад расширенный | INVENTORY | Приёмка, инвентаризация |

---

## Этап 1: Платформа (PLATFORM)

**Модуль:** PLATFORM

**Сущности:** PlatformStaff

**Задачи:**
- PlatformStaff CRUD
- Роли: platform_admin (MVP), остальные позже
- Auth: email + password (не OTP)
- Guards: PlatformAuthGuard, PlatformRolesGuard

**Схема:**
```typescript
PlatformStaff {
  email: string;
  passwordHash: string;
  name: string;
  roles: PlatformRole[];
  status: 'active' | 'inactive';
  lastLoginAt: Date;
}
```

**Детали:** [stage-1.md](./stage-1.md)

---

## Этап 2: Модерация

**Модуль:** PLATFORM.Moderation

**Задачи:**
- Модерация селлеров: заявки, KYC, верификация, блокировка
- Модерация магазинов: активация, блокировка
- Модерация товаров: скрытие нарушений
- Модерация отзывов: удаление

**Сущность:**
```typescript
ModerationAction {
  targetType: 'seller' | 'shop' | 'product' | 'review';
  targetId: ObjectId;
  action: 'approve' | 'reject' | 'block' | 'unblock' | 'hide';
  performedBy: ObjectId;
  reason?: string;
  timestamp: Date;
}
```

**Детали:** [stage-2.md](./stage-2.md)

---

## Этап 3: Admin Panel

**Задачи:**
- React админ-панель (своя, не сторонняя)
- Разделы: Селлеры, Магазины, Заказы, Финансы, Поддержка, Каталог, Аудит, Настройки
- Role-based доступ к разделам
- API: `/api/platform/**`

**Ключевые экраны:**
| Раздел | Функции |
|--------|----------|
| Селлеры | Список, заявки, KYC, блокировки |
| Магазины | Список, активация, статистика |
| Заказы | Просмотр, проблемные кейсы, корректировки |
| Финансы | Периоды, штрафы/бонусы, выплаты |
| Поддержка | Тикеты, споры, возвраты |
| Каталог | Модерация товаров |
| Аудит | Логи действий, фильтры |
| Настройки | Комиссии, лимиты, города |

**Детали:** [stage-3.md](./stage-3.md)

---

## Этап 4: Аудит (AUDIT)

**Модуль:** AUDIT

**Сущность:** AuditLog

**Задачи:**
- Схема AuditLog (actor, action, target, changes)
- AuditPort.log() для записи
- Категории: finance, moderation, inventory, order, auth, settings, support
- Просмотр в Admin Panel с фильтрами
- Ретенция: 2 года (финансы), 1 год (остальное)

**Схема:**
```typescript
AuditLog {
  timestamp: Date;
  actor: { type, id, name?, ip? };
  action: AuditAction;
  category: AuditCategory;
  target: { type, id };
  changes?: { before?, after? };
  metadata?: Record<string, any>;
}
```

**Детали:** [stage-4.md](./stage-4.md)

---

## Этап 5: Аналитика (ANALYTICS)

**Модуль:** ANALYTICS

**Задачи:**
- Базовые метрики: GMV, Revenue, количество заказов
- Дашборд платформы (Admin Panel)
- Дашборд селлера (Seller Panel)
- События: просмотры, клики, добавления в корзину (позже)

**Дашборд платформы:**
- GMV по дням/неделям
- Количество заказов
- Количество активных селлеров/магазинов
- Топ магазинов по выручке

**Детали:** [stage-5.md](./stage-5.md)

---

## Этап 6: Склад расширенный (INVENTORY)

**Модуль:** INVENTORY.Operations

**Задачи:**
- Приёмка товара (Receiving)
- Инвентаризация (InventoryCheck)
- Перемещения между локациями (Transfer) — если >1 склад

**Receiving:**
```typescript
Receiving {
  supplierId?: string;
  invoiceNumber?: string;
  items: {
    productId: ObjectId;
    expectedQuantity: number;
    actualQuantity: number;
    batchInfo?: { expiresAt, costPrice };
  }[];
}
```

**InventoryCheck:**
```typescript
InventoryCheck {
  type: 'full' | 'partial' | 'category';
  items: {
    productId: ObjectId;
    expectedQuantity: number;
    actualQuantity: number;
    discrepancy: number;
  }[];
  approvedBy?: ObjectId;
}
```

**Детали:** [stage-6.md](./stage-6.md)

---

## Критерии готовности

- [ ] PlatformStaff с ролями работает
- [ ] Модерация селлеров/магазинов/товаров работает
- [ ] Admin Panel развёрнута
- [ ] Аудит-логи записываются и просматриваются
- [ ] Базовые дашборды показывают метрики
- [ ] Приёмка и инвентаризация работают
